import Foundation
import Network

/** Raw TCP to a network printer (port 9100 by convention), via Network.framework. */
final class TcpTransport {
  private let queue = DispatchQueue(label: "mseller.thermalprinter.tcp")
  private var connection: NWConnection?
  var onDisconnected: (() -> Void)?

  var isConnected: Bool {
    queue.sync { connection?.state == .ready }
  }

  /** Blocks the calling queue until the socket is ready or fails. */
  func connect(host: String, port: Int, timeoutMs: Int) throws {
    guard let nwPort = NWEndpoint.Port(rawValue: UInt16(clamping: port)), port > 0 else {
      throw PrinterError(code: "E_CONNECT", message: "Invalid port")
    }
    disconnect()

    let options = NWProtocolTCP.Options()
    options.noDelay = true
    options.connectionTimeout = max(1, timeoutMs / 1000)
    let next = NWConnection(host: NWEndpoint.Host(host), port: nwPort, using: NWParameters(tls: nil, tcp: options))

    let signal = DispatchSemaphore(value: 0)
    var failure: PrinterError?
    var settled = false

    next.stateUpdateHandler = { [weak self, weak next] state in
      switch state {
      case .ready:
        if !settled {
          settled = true
          signal.signal()
        }
      case .failed(let error), .waiting(let error):
        if !settled {
          settled = true
          failure = PrinterError(code: "E_CONNECT", message: error.localizedDescription)
          signal.signal()
        } else if case .failed = state {
          self?.handleDrop(next)
        }
      case .cancelled:
        if settled { self?.handleDrop(next) }
      default:
        break
      }
    }

    queue.sync { connection = next }
    next.start(queue: queue)

    if signal.wait(timeout: .now() + .milliseconds(timeoutMs > 0 ? timeoutMs : 10000)) == .timedOut {
      queue.sync { settled = true }
      disconnect()
      throw PrinterError(code: "E_CONNECT", message: "Timed out connecting to the printer")
    }
    if let failure = queue.sync(execute: { failure }) {
      disconnect()
      throw failure
    }
  }

  private func handleDrop(_ dropped: NWConnection?) {
    guard let dropped = dropped, dropped === connection else { return }
    connection = nil
    onDisconnected?()
  }

  func write(_ data: Data, chunkSize: Int, delayMs: Int) throws {
    guard let current = queue.sync(execute: { connection }), current.state == .ready else {
      throw PrinterError(code: "E_NOT_CONNECTED", message: "The printer is not connected")
    }
    let size = chunkSize > 0 ? chunkSize : 4096
    var offset = 0
    while offset < data.count {
      let end = min(offset + size, data.count)
      let signal = DispatchSemaphore(value: 0)
      var sendError: NWError?
      current.send(content: data.subdata(in: offset..<end), completion: .contentProcessed { error in
        sendError = error
        signal.signal()
      })
      if signal.wait(timeout: .now() + .seconds(10)) == .timedOut {
        throw PrinterError(code: "E_WRITE", message: "Timed out writing to the printer")
      }
      if let error = queue.sync(execute: { sendError }) {
        throw PrinterError(code: "E_WRITE", message: error.localizedDescription)
      }
      offset = end
      if delayMs > 0 && offset < data.count {
        Thread.sleep(forTimeInterval: Double(delayMs) / 1000)
      }
    }
  }

  func disconnect() {
    let current: NWConnection? = queue.sync {
      let c = connection
      connection = nil
      return c
    }
    current?.stateUpdateHandler = nil
    current?.cancel()
  }
}
