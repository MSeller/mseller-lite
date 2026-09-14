import ExpoModulesCore
import Foundation

struct WriteOptions: Record {
  @Field var chunkSize: Int = 0
  @Field var delayMs: Int = 0
}

/**
 * Raw byte transport to thermal printers: BLE (CoreBluetooth) and TCP (Network.framework).
 * Bluetooth Classic serial is not available to iOS apps without MFi, so `bt-classic` is
 * reported unsupported. The module knows nothing about ESC/POS — JS sends encoded bytes.
 */
public class ThermalPrinterModule: Module {
  private let ble = BleTransport()
  private let tcp = TcpTransport()
  private let io = DispatchQueue(label: "mseller.thermalprinter.io")
  // Written on `io`, but read by the synchronous `isConnected` on the JS thread. A lock, not
  // io.sync: connects and writes block `io` for seconds.
  private let stateLock = NSLock()
  private var activeKindStorage: String?
  private var activeKind: String? {
    get { stateLock.lock(); defer { stateLock.unlock() }; return activeKindStorage }
    set { stateLock.lock(); defer { stateLock.unlock() }; activeKindStorage = newValue }
  }

  public func definition() -> ModuleDefinition {
    Name("ThermalPrinter")

    Events("onDeviceFound", "onScanStopped", "onConnectionChange")

    OnCreate {
      ble.onDeviceFound = { [weak self] id, name, rssi in
        self?.sendEvent("onDeviceFound", ["kind": "ble", "address": id, "name": name as Any, "rssi": rssi])
      }
      ble.onScanStopped = { [weak self] error in
        self?.sendEvent("onScanStopped", ["error": error as Any])
      }
      ble.onDisconnected = { [weak self] in
        self?.handleDisconnect(kind: "ble")
      }
      tcp.onDisconnected = { [weak self] in
        self?.handleDisconnect(kind: "tcp")
      }
    }

    Function("isSupported") { (kind: String) -> Bool in
      kind == "ble" || kind == "tcp"
    }

    Function("isBluetoothEnabled") { () -> Bool in
      // CoreBluetooth only reports power state asynchronously; connect/scan surface
      // E_BLUETOOTH_OFF instead.
      true
    }

    AsyncFunction("requestPermissions") { (promise: Promise) in
      ble.requestAuthorization { granted in
        promise.resolve(["granted": granted, "status": granted ? "granted" : "denied"])
      }
    }

    Function("startBleScan") { (timeoutMs: Int) in
      ble.startScan(timeoutMs: timeoutMs)
    }

    Function("stopBleScan") {
      ble.stopScan()
    }

    AsyncFunction("getBondedDevices") { () -> [[String: Any]] in
      []
    }

    AsyncFunction("connect") { (kind: String, address: String, timeoutMs: Int, promise: Promise) in
      io.async {
        do {
          self.closeActive()
          switch kind {
          case "ble":
            try self.ble.connect(identifier: address, timeoutMs: timeoutMs)
          case "tcp":
            let (host, port) = ThermalPrinterModule.splitHostPort(address)
            try self.tcp.connect(host: host, port: port, timeoutMs: timeoutMs)
          default:
            throw PrinterError(code: "E_TRANSPORT", message: "Transport not supported on iOS: \(kind)")
          }
          self.activeKind = kind
          self.sendEvent("onConnectionChange", ["connected": true, "error": NSNull()])
          promise.resolve(nil)
        } catch let error as PrinterError {
          promise.reject(error.code, error.message)
        } catch {
          promise.reject("E_CONNECT", error.localizedDescription)
        }
      }
    }

    AsyncFunction("write") { (base64: String, options: WriteOptions, promise: Promise) in
      io.async {
        do {
          guard let data = Data(base64Encoded: base64) else {
            throw PrinterError(code: "E_WRITE", message: "Invalid data")
          }
          switch self.activeKind {
          case "ble":
            try self.ble.write(data, chunkSize: options.chunkSize, delayMs: options.delayMs)
          case "tcp":
            try self.tcp.write(data, chunkSize: options.chunkSize, delayMs: options.delayMs)
          default:
            throw PrinterError(code: "E_NOT_CONNECTED", message: "The printer is not connected")
          }
          promise.resolve(nil)
        } catch let error as PrinterError {
          if error.code == "E_WRITE" { self.dropAfterFailedWrite() }
          promise.reject(error.code, error.message)
        } catch {
          self.dropAfterFailedWrite()
          promise.reject("E_WRITE", error.localizedDescription)
        }
      }
    }

    AsyncFunction("disconnect") { (promise: Promise) in
      io.async {
        let hadConnection = self.activeKind != nil
        self.closeActive()
        if hadConnection {
          self.sendEvent("onConnectionChange", ["connected": false, "error": NSNull()])
        }
        promise.resolve(nil)
      }
    }

    Function("isConnected") { () -> Bool in
      switch activeKind {
      case "ble": return ble.isConnected
      case "tcp": return tcp.isConnected
      default: return false
      }
    }

    OnDestroy {
      ble.stopScan()
      ble.disconnect()
      tcp.disconnect()
    }
  }

  private func closeActive() {
    switch activeKind {
    case "ble": ble.disconnect()
    case "tcp": tcp.disconnect()
    default: break
    }
    activeKind = nil
  }

  /// Part of the ticket may already be printed and the link is in an unknown state: drop it so
  /// the next job reconnects (JS does not resend after E_WRITE). Runs on `io`.
  private func dropAfterFailedWrite() {
    guard activeKind != nil else { return }
    closeActive()
    sendEvent("onConnectionChange", ["connected": false, "error": NSNull()])
  }

  private func handleDisconnect(kind: String) {
    io.async {
      guard self.activeKind == kind else { return }
      self.activeKind = nil
      self.sendEvent("onConnectionChange", ["connected": false, "error": NSNull()])
    }
  }

  static func splitHostPort(_ address: String) -> (String, Int) {
    guard let separator = address.lastIndex(of: ":") else { return (address, 9100) }
    let host = String(address[..<separator])
    let port = Int(address[address.index(after: separator)...]) ?? 9100
    return (host, port)
  }
}
