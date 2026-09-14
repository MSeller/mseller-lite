package expo.modules.thermalprinter

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothSocket
import androidx.annotation.RequiresPermission
import java.io.IOException
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.util.Timer
import java.util.TimerTask
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

/** One open link to a printer. Every method blocks and must run off the main thread. */
interface PrinterConnection {
  val isOpen: Boolean
  fun open(timeoutMs: Int)
  fun write(data: ByteArray, chunkSize: Int, delayMs: Long)
  fun close()
}

/** Writes `data` to a stream in chunks, pausing between them so small printer buffers keep up. */
internal fun writeChunked(stream: OutputStream, data: ByteArray, chunkSize: Int, delayMs: Long) {
  val size = if (chunkSize > 0) chunkSize else data.size.coerceAtLeast(1)
  var offset = 0
  while (offset < data.size) {
    val end = minOf(offset + size, data.size)
    stream.write(data, offset, end - offset)
    stream.flush()
    offset = end
    if (delayMs > 0 && offset < data.size) Thread.sleep(delayMs)
  }
}

/** Raw TCP, conventionally port 9100 ("JetDirect"). */
class TcpConnection(private val host: String, private val port: Int) : PrinterConnection {
  private var socket: Socket? = null

  override val isOpen: Boolean
    get() = socket?.let { it.isConnected && !it.isClosed } ?: false

  override fun open(timeoutMs: Int) {
    val s = Socket()
    try {
      s.tcpNoDelay = true
      s.soTimeout = timeoutMs
      s.connect(InetSocketAddress(host, port), timeoutMs)
    } catch (e: IOException) {
      runCatching { s.close() }
      throw e
    }
    socket = s
  }

  override fun write(data: ByteArray, chunkSize: Int, delayMs: Long) {
    val s = socket ?: throw IOException("Not connected")
    writeChunked(s.getOutputStream(), data, if (chunkSize > 0) chunkSize else 4096, delayMs)
  }

  override fun close() {
    runCatching { socket?.close() }
    socket = null
  }
}

/** Bluetooth Classic serial port profile (RFCOMM). */
class ClassicConnection(
  private val adapter: BluetoothAdapter,
  private val address: String
) : PrinterConnection {
  private var socket: BluetoothSocket? = null

  override val isOpen: Boolean
    get() = socket?.isConnected ?: false

  @SuppressLint("MissingPermission")
  @RequiresPermission(Manifest.permission.BLUETOOTH_CONNECT)
  override fun open(timeoutMs: Int) {
    val device = adapter.getRemoteDevice(address)
    // Discovery hogs the radio and makes RFCOMM connects fail or crawl.
    runCatching { adapter.cancelDiscovery() }

    // One deadline for both attempts, so a stalled printer cannot hold the I/O thread.
    val deadline = System.currentTimeMillis() + timeoutMs.coerceAtLeast(1)

    val secure = device.createRfcommSocketToServiceRecord(SPP_UUID)
    try {
      connectBefore(secure, deadline)
      socket = secure
      return
    } catch (e: IOException) {
      runCatching { secure.close() }
      if (System.currentTimeMillis() >= deadline) throw e
    }

    // Many cheap printers only accept an unauthenticated link.
    val insecure = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID)
    try {
      connectBefore(insecure, deadline)
      socket = insecure
    } catch (e: IOException) {
      runCatching { insecure.close() }
      throw e
    }
  }

  /**
   * `BluetoothSocket.connect()` has no timeout and only returns early when another thread
   * closes the socket, so a timer does exactly that at the deadline.
   */
  private fun connectBefore(s: BluetoothSocket, deadline: Long) {
    val remaining = deadline - System.currentTimeMillis()
    if (remaining <= 0) throw IOException("Timed out connecting to the printer")
    val timedOut = AtomicBoolean(false)
    val timer = Timer("thermal-printer-rfcomm-timeout", true)
    timer.schedule(object : TimerTask() {
      override fun run() {
        timedOut.set(true)
        runCatching { s.close() }
      }
    }, remaining)
    try {
      s.connect()
    } catch (e: IOException) {
      if (timedOut.get()) throw IOException("Timed out connecting to the printer", e)
      throw e
    } finally {
      timer.cancel()
    }
    if (timedOut.get()) throw IOException("Timed out connecting to the printer")
  }

  override fun write(data: ByteArray, chunkSize: Int, delayMs: Long) {
    val s = socket ?: throw IOException("Not connected")
    writeChunked(s.outputStream, data, if (chunkSize > 0) chunkSize else 1024, delayMs)
  }

  override fun close() {
    runCatching { socket?.close() }
    socket = null
  }

  companion object {
    val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
  }
}
