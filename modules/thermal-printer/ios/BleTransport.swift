import CoreBluetooth
import Foundation

struct PrinterError: Error {
  let code: String
  let message: String
}

/**
 * CoreBluetooth side of the printer module: scanning, connecting to a peripheral, finding
 * its write characteristic, and paced writes.
 *
 * Every CoreBluetooth call and callback happens on `queue`. Blocking operations (connect,
 * write) are driven from a separate I/O queue and wait on semaphores signalled from here.
 */
final class BleTransport: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
  typealias DeviceFound = (_ id: String, _ name: String?, _ rssi: Int) -> Void

  let queue = DispatchQueue(label: "mseller.thermalprinter.ble")

  var onDeviceFound: DeviceFound?
  var onScanStopped: ((String?) -> Void)?
  var onDisconnected: (() -> Void)?

  private var central: CBCentralManager!
  private var stateWaiters: [(CBManagerState) -> Void] = []

  private var peripheral: CBPeripheral?
  private var characteristic: CBCharacteristic?
  private var pendingServices = 0
  private var connectSignal: DispatchSemaphore?
  private var connectError: PrinterError?
  private var awaitedIdentifier: UUID?

  private var writeSignal: DispatchSemaphore?
  private var writeError: Error?
  private var scanStopWork: DispatchWorkItem?

  private static let preferredServices: [CBUUID] = [
    CBUUID(string: "18F0"),
    CBUUID(string: "E7810A71-73AE-499D-8C15-FAA9AEF0C3F2"),
    CBUUID(string: "49535343-FE7D-4AE5-8FA9-9FAFD205E455"),
    CBUUID(string: "FF00"),
    CBUUID(string: "FFE0"),
    CBUUID(string: "FFF0"),
  ]
  private static let ignoredServices: Set<CBUUID> = [CBUUID(string: "1800"), CBUUID(string: "1801"), CBUUID(string: "180A")]

  override init() {
    super.init()
  }

  var isConnected: Bool {
    queue.sync { peripheral?.state == .connected && characteristic != nil }
  }

  // MARK: - Central state

  /** Creates the manager lazily: creating it is what shows the iOS Bluetooth prompt. */
  private func withPoweredState(_ body: @escaping (CBManagerState) -> Void) {
    if central == nil {
      stateWaiters.append(body)
      central = CBCentralManager(delegate: self, queue: queue, options: [CBCentralManagerOptionShowPowerAlertKey: false])
      return
    }
    if central.state == .unknown || central.state == .resetting {
      stateWaiters.append(body)
    } else {
      body(central.state)
    }
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    if central.state != .unknown && central.state != .resetting {
      let waiters = stateWaiters
      stateWaiters.removeAll()
      waiters.forEach { $0(central.state) }
    }
    if central.state != .poweredOn, peripheral != nil {
      dropConnection(notify: true)
    }
  }

  /** Resolves to whether the app may use Bluetooth (asking the user the first time). */
  func requestAuthorization(_ completion: @escaping (Bool) -> Void) {
    queue.async {
      self.withPoweredState { _ in
        let status = CBManager.authorization
        completion(status == .allowedAlways)
      }
    }
  }

  private static func stateError(_ state: CBManagerState) -> PrinterError? {
    switch state {
    case .poweredOn: return nil
    case .unauthorized: return PrinterError(code: "E_PERMISSION", message: "Bluetooth permission not granted")
    case .poweredOff: return PrinterError(code: "E_BLUETOOTH_OFF", message: "Bluetooth is turned off")
    case .unsupported: return PrinterError(code: "E_BLUETOOTH_UNAVAILABLE", message: "This device has no Bluetooth LE")
    default: return PrinterError(code: "E_BLUETOOTH_UNAVAILABLE", message: "Bluetooth is not available")
    }
  }

  // MARK: - Scan

  func startScan(timeoutMs: Int) {
    queue.async {
      self.withPoweredState { state in
        if let error = BleTransport.stateError(state) {
          self.onScanStopped?(error.message)
          return
        }
        self.stopScanOnQueue(emit: false)
        self.central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        let work = DispatchWorkItem { [weak self] in self?.stopScanOnQueue(emit: true) }
        self.scanStopWork = work
        self.queue.asyncAfter(deadline: .now() + .milliseconds(timeoutMs > 0 ? timeoutMs : 10000), execute: work)
      }
    }
  }

  func stopScan() {
    queue.async { self.stopScanOnQueue(emit: true) }
  }

  private func stopScanOnQueue(emit: Bool) {
    scanStopWork?.cancel()
    scanStopWork = nil
    guard let central = central, central.isScanning else { return }
    central.stopScan()
    if emit { onScanStopped?(nil) }
  }

  func centralManager(
    _ central: CBCentralManager,
    didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any],
    rssi RSSI: NSNumber
  ) {
    if let awaited = awaitedIdentifier, peripheral.identifier == awaited {
      awaitedIdentifier = nil
      central.stopScan()
      beginConnect(peripheral)
      return
    }
    let name = (advertisementData[CBAdvertisementDataLocalNameKey] as? String) ?? peripheral.name
    onDeviceFound?(peripheral.identifier.uuidString, name, RSSI.intValue)
  }

  // MARK: - Connect

  /** Blocks the calling (non-BLE) queue until the characteristic is ready or it fails. */
  func connect(identifier: String, timeoutMs: Int) throws {
    guard let uuid = UUID(uuidString: identifier) else {
      throw PrinterError(code: "E_CONNECT", message: "Invalid Bluetooth device id")
    }
    let signal = DispatchSemaphore(value: 0)

    queue.async {
      self.dropConnection(notify: false)
      self.connectSignal = signal
      self.connectError = nil
      self.withPoweredState { state in
        if let error = BleTransport.stateError(state) {
          self.finishConnect(error)
          return
        }
        if let known = self.central.retrievePeripherals(withIdentifiers: [uuid]).first {
          self.beginConnect(known)
        } else {
          // Not cached by iOS yet (for example after reinstalling): find it by scanning.
          self.stopScanOnQueue(emit: true)
          self.awaitedIdentifier = uuid
          self.central.scanForPeripherals(withServices: nil, options: nil)
        }
      }
    }

    let timeout = DispatchTime.now() + .milliseconds(timeoutMs > 0 ? timeoutMs : 10000)
    if signal.wait(timeout: timeout) == .timedOut {
      queue.sync {
        self.connectSignal = nil
        if self.awaitedIdentifier != nil {
          self.awaitedIdentifier = nil
          self.central?.stopScan()
        }
        self.dropConnection(notify: false)
      }
      throw PrinterError(code: "E_CONNECT", message: "Timed out connecting to the printer")
    }
    if let error = queue.sync(execute: { connectError }) {
      throw error
    }
  }

  private func beginConnect(_ target: CBPeripheral) {
    peripheral = target
    characteristic = nil
    target.delegate = self
    central.connect(target, options: nil)
  }

  private func finishConnect(_ error: PrinterError?) {
    connectError = error
    if error != nil { dropConnection(notify: false) }
    connectSignal?.signal()
    connectSignal = nil
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    peripheral.discoverServices(nil)
  }

  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
    finishConnect(PrinterError(code: "E_CONNECT", message: error?.localizedDescription ?? "Could not connect to the printer"))
  }

  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
    guard peripheral == self.peripheral else { return }
    if connectSignal != nil {
      finishConnect(PrinterError(code: "E_CONNECT", message: "The printer disconnected"))
      return
    }
    let wasReady = characteristic != nil
    self.peripheral = nil
    characteristic = nil
    if let signal = writeSignal {
      writeError = PrinterError(code: "E_WRITE", message: "The printer disconnected")
      signal.signal()
    }
    if wasReady { onDisconnected?() }
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    guard let services = peripheral.services, error == nil, !services.isEmpty else {
      finishConnect(PrinterError(code: "E_CONNECT", message: "Could not read the printer's services"))
      return
    }
    pendingServices = services.count
    services.forEach { peripheral.discoverCharacteristics(nil, for: $0) }
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    pendingServices -= 1
    guard pendingServices <= 0, connectSignal != nil else { return }

    let services = peripheral.services ?? []
    func writable(_ c: CBCharacteristic) -> Bool {
      c.properties.contains(.write) || c.properties.contains(.writeWithoutResponse)
    }
    var found: CBCharacteristic?
    for uuid in BleTransport.preferredServices {
      if let match = services.first(where: { $0.uuid == uuid })?.characteristics?.first(where: writable) {
        found = match
        break
      }
    }
    if found == nil {
      found = services
        .filter { !BleTransport.ignoredServices.contains($0.uuid) }
        .flatMap { $0.characteristics ?? [] }
        .first(where: writable)
    }

    guard let characteristic = found else {
      finishConnect(PrinterError(code: "E_CONNECT", message: "The device has no writable characteristic"))
      return
    }
    self.characteristic = characteristic
    finishConnect(nil)
  }

  // MARK: - Write

  /** Blocks the calling (non-BLE) queue until every chunk is written. */
  func write(_ data: Data, chunkSize: Int, delayMs: Int) throws {
    let (target, char) = queue.sync { (peripheral, characteristic) }
    guard let peripheral = target, let characteristic = char, peripheral.state == .connected else {
      throw PrinterError(code: "E_NOT_CONNECTED", message: "The printer is not connected")
    }

    let withoutResponse = characteristic.properties.contains(.writeWithoutResponse)
    let type: CBCharacteristicWriteType = withoutResponse ? .withoutResponse : .withResponse
    let maxLength = max(20, peripheral.maximumWriteValueLength(for: type))
    let size = chunkSize > 0 ? min(chunkSize, maxLength) : maxLength

    var offset = 0
    while offset < data.count {
      let end = min(offset + size, data.count)
      let chunk = data.subdata(in: offset..<end)
      let signal = DispatchSemaphore(value: 0)

      queue.async {
        guard self.peripheral === peripheral, peripheral.state == .connected else {
          self.writeError = PrinterError(code: "E_WRITE", message: "The printer disconnected")
          signal.signal()
          return
        }
        self.writeError = nil
        self.writeSignal = signal
        if withoutResponse {
          if peripheral.canSendWriteWithoutResponse {
            peripheral.writeValue(chunk, for: characteristic, type: .withoutResponse)
            self.writeSignal = nil
            signal.signal()
          } else {
            // Wait for peripheralIsReady(toSendWriteWithoutResponse:), which re-sends.
            self.pendingChunk = chunk
          }
        } else {
          peripheral.writeValue(chunk, for: characteristic, type: .withResponse)
        }
      }

      if signal.wait(timeout: .now() + .seconds(5)) == .timedOut {
        queue.sync {
          self.writeSignal = nil
          self.pendingChunk = nil
        }
        throw PrinterError(code: "E_WRITE", message: "Timed out writing to the printer")
      }
      if let error = queue.sync(execute: { writeError }) {
        throw error
      }

      offset = end
      if delayMs > 0 && offset < data.count {
        Thread.sleep(forTimeInterval: Double(delayMs) / 1000)
      }
    }
  }

  private var pendingChunk: Data?

  func peripheralIsReady(toSendWriteWithoutResponse peripheral: CBPeripheral) {
    guard let chunk = pendingChunk, let characteristic = characteristic else { return }
    pendingChunk = nil
    peripheral.writeValue(chunk, for: characteristic, type: .withoutResponse)
    writeSignal?.signal()
    writeSignal = nil
  }

  func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
    if let error = error {
      writeError = PrinterError(code: "E_WRITE", message: error.localizedDescription)
    }
    writeSignal?.signal()
    writeSignal = nil
  }

  // MARK: - Disconnect

  func disconnect() {
    queue.sync { dropConnection(notify: false) }
  }

  private func dropConnection(notify: Bool) {
    let current = peripheral
    let wasReady = characteristic != nil
    peripheral = nil
    characteristic = nil
    pendingChunk = nil
    if let current = current, let central = central {
      central.cancelPeripheralConnection(current)
    }
    if notify && wasReady { onDisconnected?() }
  }
}

extension PrinterError: LocalizedError {
  var errorDescription: String? { message }
}
