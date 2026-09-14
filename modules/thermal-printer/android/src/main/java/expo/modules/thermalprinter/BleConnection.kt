package expo.modules.thermalprinter

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothProfile
import android.content.Context
import android.os.Build
import java.io.IOException
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * A BLE printer reached through a GATT write characteristic.
 *
 * Printers don't agree on a service, so the characteristic is discovered: known ESC/POS
 * "transparent UART" services first, then the first writable characteristic outside the
 * generic GAP/GATT services.
 */
@SuppressLint("MissingPermission")
class BleConnection(
  private val context: Context,
  private val adapter: BluetoothAdapter,
  private val address: String,
  private val onDisconnected: () -> Unit
) : PrinterConnection {
  @Volatile private var gatt: BluetoothGatt? = null
  @Volatile private var characteristic: BluetoothGattCharacteristic? = null
  @Volatile private var connected = false
  @Volatile private var mtu = 23

  private var readyLatch = CountDownLatch(1)
  @Volatile private var openError: String? = null
  @Volatile private var writeLatch: CountDownLatch? = null
  @Volatile private var writeStatus = BluetoothGatt.GATT_SUCCESS

  override val isOpen: Boolean
    get() = connected && characteristic != null

  private val callback = object : BluetoothGattCallback() {
    override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
      if (newState == BluetoothProfile.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS) {
        connected = true
        // A larger MTU cuts a ticket into far fewer writes. Not every printer honours it;
        // discovery continues from onMtuChanged either way.
        if (!g.requestMtu(REQUESTED_MTU)) g.discoverServices()
      } else {
        val wasReady = isOpen
        connected = false
        characteristic = null
        if (readyLatch.count > 0) {
          openError = "GATT connection failed (status $status)"
          readyLatch.countDown()
        }
        writeLatch?.let {
          writeStatus = BluetoothGatt.GATT_FAILURE
          it.countDown()
        }
        runCatching { g.close() }
        if (gatt === g) gatt = null
        if (wasReady) onDisconnected()
      }
    }

    override fun onMtuChanged(g: BluetoothGatt, newMtu: Int, status: Int) {
      if (status == BluetoothGatt.GATT_SUCCESS) mtu = newMtu
      g.discoverServices()
    }

    override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
      if (status != BluetoothGatt.GATT_SUCCESS) {
        openError = "Service discovery failed (status $status)"
      } else {
        characteristic = findWritableCharacteristic(g)
        if (characteristic == null) openError = "The device has no writable characteristic"
      }
      readyLatch.countDown()
    }

    override fun onCharacteristicWrite(
      g: BluetoothGatt,
      c: BluetoothGattCharacteristic,
      status: Int
    ) {
      writeStatus = status
      writeLatch?.countDown()
    }
  }

  override fun open(timeoutMs: Int) {
    readyLatch = CountDownLatch(1)
    openError = null
    val device = adapter.getRemoteDevice(address)
    gatt = device.connectGatt(context, false, callback, BluetoothDevice.TRANSPORT_LE)
      ?: throw IOException("Could not start a GATT connection")

    val finished = readyLatch.await(timeoutMs.toLong(), TimeUnit.MILLISECONDS)
    val error = if (!finished) "Timed out connecting to the printer" else openError
    if (error != null) {
      close()
      throw IOException(error)
    }
  }

  override fun write(data: ByteArray, chunkSize: Int, delayMs: Long) {
    val g = gatt ?: throw IOException("Not connected")
    val c = characteristic ?: throw IOException("Not connected")

    val maxPayload = (mtu - 3).coerceAtLeast(20)
    val size = if (chunkSize > 0) minOf(chunkSize, maxPayload) else maxPayload
    val type = if (c.properties and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE != 0) {
      BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
    } else {
      BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
    }

    var offset = 0
    while (offset < data.size) {
      val end = minOf(offset + size, data.size)
      val chunk = data.copyOfRange(offset, end)
      writeChunk(g, c, chunk, type)
      offset = end
      if (delayMs > 0 && offset < data.size) Thread.sleep(delayMs)
    }
  }

  /**
   * One GATT write, waiting for onCharacteristicWrite. Android delivers that callback for
   * no-response writes too, once the stack has taken the packet, so waiting on it is the flow
   * control that keeps a long ticket from overrunning the controller's queue.
   */
  private fun writeChunk(g: BluetoothGatt, c: BluetoothGattCharacteristic, chunk: ByteArray, type: Int) {
    var attempt = 0
    while (true) {
      val latch = CountDownLatch(1)
      writeLatch = latch
      writeStatus = BluetoothGatt.GATT_SUCCESS

      val started = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        g.writeCharacteristic(c, chunk, type) == BluetoothGatt.GATT_SUCCESS
      } else {
        @Suppress("DEPRECATION")
        run {
          c.writeType = type
          c.value = chunk
          g.writeCharacteristic(c)
        }
      }

      if (!started) {
        // The stack is still busy with the previous operation: back off briefly and retry.
        writeLatch = null
        if (++attempt > WRITE_RETRIES) throw IOException("The printer did not accept data")
        Thread.sleep(20)
        continue
      }

      val done = latch.await(WRITE_TIMEOUT_MS, TimeUnit.MILLISECONDS)
      writeLatch = null
      if (!connected) throw IOException("The printer disconnected")
      if (!done) throw IOException("Timed out writing to the printer")
      if (writeStatus != BluetoothGatt.GATT_SUCCESS) throw IOException("Write failed (status $writeStatus)")
      return
    }
  }

  override fun close() {
    val g = gatt
    gatt = null
    characteristic = null
    connected = false
    if (g != null) {
      runCatching { g.disconnect() }
      runCatching { g.close() }
    }
  }

  companion object {
    private const val REQUESTED_MTU = 512
    private const val WRITE_TIMEOUT_MS = 5000L
    private const val WRITE_RETRIES = 50

    private fun uuid16(short: String): UUID = UUID.fromString("0000$short-0000-1000-8000-00805f9b34fb")

    /** Services thermal printers use for their ESC/POS pipe, most specific first. */
    val PREFERRED_SERVICES: List<UUID> = listOf(
      uuid16("18f0"),
      UUID.fromString("e7810a71-73ae-499d-8c15-faa9aef0c3f2"),
      UUID.fromString("49535343-fe7d-4ae5-8fa9-9fafd205e455"),
      uuid16("ff00"),
      uuid16("ffe0"),
      uuid16("fff0"),
    )

    private val IGNORED_SERVICES = setOf(uuid16("1800"), uuid16("1801"), uuid16("180a"))

    private fun isWritable(c: BluetoothGattCharacteristic): Boolean =
      c.properties and (BluetoothGattCharacteristic.PROPERTY_WRITE or
        BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0

    fun findWritableCharacteristic(g: BluetoothGatt): BluetoothGattCharacteristic? {
      for (serviceUuid in PREFERRED_SERVICES) {
        g.getService(serviceUuid)?.characteristics?.firstOrNull(::isWritable)?.let { return it }
      }
      return g.services
        .filter { it.uuid !in IGNORED_SERVICES }
        .flatMap { it.characteristics }
        .firstOrNull(::isWritable)
    }
  }
}
