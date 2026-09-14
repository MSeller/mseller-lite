import type { DiscoveredDevice, TransportKind } from "../../../services/printing/transports/types";

export type ThermalPrinterEvents = {
  onDeviceFound: (device: DiscoveredDevice) => void;
  /** `error` is null when the scan simply timed out or was stopped. */
  onScanStopped: (event: { error: string | null }) => void;
  onConnectionChange: (event: { connected: boolean; error: string | null }) => void;
};

export interface WriteOptions {
  /** Max bytes per write. 0 lets native pick (BLE: negotiated MTU; sockets: 1-4 KB). */
  chunkSize?: number;
  /** Pause between chunks, for printers with small receive buffers. */
  delayMs?: number;
}

export interface PermissionResult {
  granted: boolean;
  status?: string;
}

export interface ThermalPrinterNativeModule {
  isSupported(kind: TransportKind): boolean;
  isBluetoothEnabled(): boolean;
  requestPermissions(): Promise<PermissionResult>;
  startBleScan(timeoutMs: number): void;
  stopBleScan(): void;
  /** Paired Bluetooth Classic devices. Android only; iOS resolves []. */
  getBondedDevices(): Promise<DiscoveredDevice[]>;
  connect(kind: TransportKind, address: string, timeoutMs: number): Promise<void>;
  /** Writes base64-encoded bytes to the open connection. */
  write(base64: string, options: WriteOptions): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  addListener<E extends keyof ThermalPrinterEvents>(
    event: E,
    listener: ThermalPrinterEvents[E]
  ): { remove(): void };
}
