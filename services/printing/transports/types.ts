/**
 * How the phone reaches a printer.
 *
 * - `ble`: Bluetooth Low Energy (GATT write characteristic). Android and iOS.
 * - `bt-classic`: Bluetooth Classic SPP/RFCOMM. Android only — iOS gives apps no access to
 *   classic Bluetooth serial devices without MFi certification.
 * - `tcp`: raw socket, conventionally port 9100 (Wi-Fi/Ethernet printers). Android and iOS.
 */
export type TransportKind = "ble" | "bt-classic" | "tcp";

export const DEFAULT_TCP_PORT = 9100;

/** A printer found by a scan or listed as paired. */
export interface DiscoveredDevice {
  kind: TransportKind;
  /**
   * What `connect` needs: a MAC address on Android, a CoreBluetooth peripheral UUID on iOS,
   * or `host:port` for TCP.
   */
  address: string;
  name: string | null;
  rssi?: number | null;
}

/** The printer the user saved, persisted on the device. */
export interface SelectedPrinter {
  profileId: string;
  transport: TransportKind;
  address: string;
  name: string | null;
}

export type ConnectionState = "disconnected" | "connecting" | "connected";

/** Parses `host[:port]`; the port defaults to 9100. Returns null for anything unusable. */
export function parseTcpAddress(input: string): { host: string; port: number } | null {
  const value = input.trim();
  if (!value) return null;
  const match = /^([^\s:]+)(?::(\d{1,5}))?$/.exec(value);
  if (!match) return null;
  const port = match[2] === undefined ? DEFAULT_TCP_PORT : Number(match[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host: match[1], port };
}
