package expo.modules.thermalprinter

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.util.concurrent.Executors

class WriteOptions : Record {
  @Field val chunkSize: Int = 0
  @Field val delayMs: Int = 0
}

class ThermalPrinterException(code: String, message: String, cause: Throwable? = null) :
  CodedException(code, message, cause)

/**
 * Raw byte transport to thermal printers: BLE (GATT), Bluetooth Classic (SPP) and TCP.
 *
 * Deliberately knows nothing about ESC/POS — JS encodes the ticket and hands over bytes, so
 * supporting another printer language never touches native code. One connection at a time.
 */
@SuppressLint("MissingPermission")
class ThermalPrinterModule : Module() {
  private val io = Executors.newSingleThreadExecutor()
  private val mainHandler = Handler(Looper.getMainLooper())

  @Volatile private var connection: PrinterConnection? = null
  private var scanCallback: ScanCallback? = null
  private val stopScanRunnable = Runnable { stopScanInternal() }

  private val context: Context
    get() = appContext.reactContext ?: throw ThermalPrinterException("E_NO_CONTEXT", "React context is not available")

  private val adapter: BluetoothAdapter?
    get() = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

  override fun definition() = ModuleDefinition {
    Name("ThermalPrinter")

    Events("onDeviceFound", "onScanStopped", "onConnectionChange")

    Function("isSupported") { kind: String ->
      when (kind) {
        "tcp" -> true
        "ble" -> context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)
        "bt-classic" -> context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH)
        else -> false
      }
    }

    Function("isBluetoothEnabled") {
      // Reading the adapter state needs BLUETOOTH_CONNECT from Android 12 on.
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
        context.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED
      ) {
        throw ThermalPrinterException("E_PERMISSION", "Bluetooth permission not granted: ${Manifest.permission.BLUETOOTH_CONNECT}")
      }
      adapter?.isEnabled == true
    }

    AsyncFunction("requestPermissions") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(
        appContext.permissions,
        promise,
        *requiredPermissions()
      )
    }

    Function("startBleScan") { timeoutMs: Int ->
      startScan(timeoutMs)
    }

    Function("stopBleScan") {
      stopScanInternal()
    }

    AsyncFunction("getBondedDevices") {
      ensurePermissions()
      val bt = adapter ?: return@AsyncFunction emptyList<Map<String, Any?>>()
      bt.bondedDevices
        .filter { it.type == BluetoothDevice.DEVICE_TYPE_CLASSIC || it.type == BluetoothDevice.DEVICE_TYPE_DUAL || it.type == BluetoothDevice.DEVICE_TYPE_UNKNOWN }
        .map { mapOf("kind" to "bt-classic", "address" to it.address, "name" to it.name, "rssi" to null) }
    }

    AsyncFunction("connect") { kind: String, address: String, timeoutMs: Int, promise: Promise ->
      io.execute {
        try {
          closeConnection(notify = false)
          val next = createConnection(kind, address)
          next.open(if (timeoutMs > 0) timeoutMs else 10000)
          connection = next
          emitConnection(true, null)
          promise.resolve(null)
        } catch (e: CodedException) {
          promise.reject(e)
        } catch (e: Throwable) {
          promise.reject(ThermalPrinterException("E_CONNECT", e.message ?: "Could not connect to the printer", e))
        }
      }
    }

    AsyncFunction("write") { base64: String, options: WriteOptions, promise: Promise ->
      io.execute {
        try {
          val current = connection
          if (current == null || !current.isOpen) {
            throw ThermalPrinterException("E_NOT_CONNECTED", "The printer is not connected")
          }
          val bytes = Base64.decode(base64, Base64.DEFAULT)
          current.write(bytes, options.chunkSize, options.delayMs.toLong())
          promise.resolve(null)
        } catch (e: CodedException) {
          promise.reject(e)
        } catch (e: Throwable) {
          // Part of the data may already be printed and the link is in an unknown state:
          // drop it so the next job reconnects instead of writing into a dead socket.
          closeConnection(notify = true)
          promise.reject(ThermalPrinterException("E_WRITE", e.message ?: "Could not send data to the printer", e))
        }
      }
    }

    AsyncFunction("disconnect") { promise: Promise ->
      io.execute {
        closeConnection(notify = true)
        promise.resolve(null)
      }
    }

    Function("isConnected") {
      connection?.isOpen == true
    }

    OnDestroy {
      mainHandler.post { stopScanInternal(emit = false) }
      io.execute { closeConnection(notify = false) }
      io.shutdown()
    }
  }

  private fun requiredPermissions(): Array<String> =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
    } else {
      // Before Android 12 a BLE scan returns nothing without location permission.
      arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
    }

  private fun ensurePermissions() {
    val missing = requiredPermissions().filter {
      context.checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
    }
    if (missing.isNotEmpty()) {
      throw ThermalPrinterException("E_PERMISSION", "Bluetooth permission not granted: ${missing.joinToString()}")
    }
  }

  private fun requireAdapter(): BluetoothAdapter {
    val bt = adapter ?: throw ThermalPrinterException("E_BLUETOOTH_UNAVAILABLE", "This device has no Bluetooth")
    if (!bt.isEnabled) throw ThermalPrinterException("E_BLUETOOTH_OFF", "Bluetooth is turned off")
    return bt
  }

  private fun createConnection(kind: String, address: String): PrinterConnection =
    when (kind) {
      "tcp" -> {
        val separator = address.lastIndexOf(':')
        val host = if (separator > 0) address.substring(0, separator) else address
        val port = if (separator > 0) address.substring(separator + 1).toIntOrNull() ?: 9100 else 9100
        TcpConnection(host, port)
      }
      "ble" -> {
        ensurePermissions()
        lateinit var ble: BleConnection
        ble = BleConnection(context, requireAdapter(), address) {
          // Only react to the link that is still current, not one already replaced.
          io.execute { if (connection === ble) closeConnection(notify = true) }
        }
        ble
      }
      "bt-classic" -> {
        ensurePermissions()
        ClassicConnection(requireAdapter(), address)
      }
      else -> throw ThermalPrinterException("E_TRANSPORT", "Unknown transport: $kind")
    }

  private fun startScan(timeoutMs: Int) {
    ensurePermissions()
    val bt = requireAdapter()
    val scanner = bt.bluetoothLeScanner ?: throw ThermalPrinterException("E_BLUETOOTH_OFF", "Bluetooth is turned off")

    mainHandler.post {
      stopScanInternal(emit = false)
      val seen = HashSet<String>()
      val callback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
          val address = result.device.address
          val name = result.scanRecord?.deviceName ?: runCatching { result.device.name }.getOrNull()
          // A device's name often arrives in a later scan response: re-emit once it does.
          val key = "$address|${name ?: ""}"
          if (!seen.add(key)) return
          sendEvent(
            "onDeviceFound",
            mapOf("kind" to "ble", "address" to address, "name" to name, "rssi" to result.rssi)
          )
        }

        override fun onScanFailed(errorCode: Int) {
          scanCallback = null
          sendEvent("onScanStopped", mapOf("error" to "Scan failed ($errorCode)"))
        }
      }
      val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
      try {
        scanner.startScan(null, settings, callback)
        scanCallback = callback
        mainHandler.postDelayed(stopScanRunnable, (if (timeoutMs > 0) timeoutMs else 10000).toLong())
      } catch (e: Throwable) {
        sendEvent("onScanStopped", mapOf("error" to (e.message ?: "Scan failed")))
      }
    }
  }

  private fun stopScanInternal(emit: Boolean = true) {
    mainHandler.removeCallbacks(stopScanRunnable)
    val callback = scanCallback ?: return
    scanCallback = null
    runCatching { adapter?.bluetoothLeScanner?.stopScan(callback) }
    if (emit) sendEvent("onScanStopped", mapOf("error" to null))
  }

  private fun closeConnection(notify: Boolean) {
    val current = connection ?: return
    connection = null
    current.close()
    if (notify) emitConnection(false, null)
  }

  private fun emitConnection(connected: Boolean, error: String?) {
    sendEvent("onConnectionChange", mapOf("connected" to connected, "error" to error))
  }
}
