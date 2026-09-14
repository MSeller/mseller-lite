import { Platform } from "react-native";

import { ThermalPrinter, type WriteOptions } from "../../modules/thermal-printer";
import { getDocumentTicket } from "../documentService";
import { bytesToBase64 } from "./bytes";
import { getDriver } from "./drivers";
import { parseTicketMarkup } from "./markup/parse";
import type { Ticket } from "./markup/types";
import { getPrinterProfile, type PrinterProfile } from "./profiles";
import type { DiscoveredDevice, SelectedPrinter, TransportKind } from "./transports/types";

/**
 * Printing a ticket end to end: fetch the marker text, parse it, encode it with the profile's
 * driver, and push the bytes through the native transport.
 *
 * Stateless on purpose — contexts/PrinterContext owns the saved printer and the connection
 * state, and serializes jobs.
 */

export type PrinterErrorCode =
  | "UNAVAILABLE"
  | "NO_PRINTER"
  | "UNSUPPORTED_TRANSPORT"
  | "E_PERMISSION"
  | "E_BLUETOOTH_OFF"
  | "E_BLUETOOTH_UNAVAILABLE"
  | "E_CONNECT"
  | "E_NOT_CONNECTED"
  | "E_WRITE";

export class PrinterError extends Error {
  constructor(
    public readonly code: PrinterErrorCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = "PrinterError";
  }
}

const CONNECT_TIMEOUT_MS = 10000;

/**
 * Pacing per transport. BLE writes already wait for the stack on both platforms; the short
 * pause is for the cheap printers whose receive buffer fills faster than the head prints.
 */
const WRITE_OPTIONS: Record<TransportKind, WriteOptions> = {
  ble: { chunkSize: 0, delayMs: 15 },
  "bt-classic": { chunkSize: 512, delayMs: 5 },
  tcp: { chunkSize: 4096, delayMs: 0 },
};

/** Whether this binary has the native transport at all (not on web, Expo Go or old builds). */
export const isPrintingAvailable = (): boolean => ThermalPrinter != null && Platform.OS !== "web";

const native = () => {
  if (!ThermalPrinter) throw new PrinterError("UNAVAILABLE");
  return ThermalPrinter;
};

export const isTransportSupported = (kind: TransportKind): boolean => {
  if (!ThermalPrinter) return false;
  try {
    return ThermalPrinter.isSupported(kind);
  } catch {
    return false;
  }
};

/** Native rejections carry a `code`; anything else is wrapped so the UI has one shape. */
export function toPrinterError(error: unknown, fallback: PrinterErrorCode = "E_WRITE"): PrinterError {
  if (error instanceof PrinterError) return error;
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message;
  const known: PrinterErrorCode[] = [
    "E_PERMISSION",
    "E_BLUETOOTH_OFF",
    "E_BLUETOOTH_UNAVAILABLE",
    "E_CONNECT",
    "E_NOT_CONNECTED",
    "E_WRITE",
  ];
  return new PrinterError(known.includes(code as PrinterErrorCode) ? (code as PrinterErrorCode) : fallback, message);
}

export async function ensureBluetoothPermission(): Promise<void> {
  const result = await native().requestPermissions();
  if (!result?.granted) throw new PrinterError("E_PERMISSION");
}

export function resolveProfile(printer: SelectedPrinter): PrinterProfile {
  const profile = getPrinterProfile(printer.profileId);
  if (!profile) throw new PrinterError("NO_PRINTER", `Unknown printer profile ${printer.profileId}`);
  return profile;
}

export function isConnected(): boolean {
  try {
    return ThermalPrinter?.isConnected() ?? false;
  } catch {
    return false;
  }
}

export async function connect(printer: SelectedPrinter): Promise<void> {
  const module = native();
  if (!isTransportSupported(printer.transport)) throw new PrinterError("UNSUPPORTED_TRANSPORT");
  if (printer.transport !== "tcp") await ensureBluetoothPermission();
  try {
    await module.connect(printer.transport, printer.address, CONNECT_TIMEOUT_MS);
  } catch (e) {
    throw toPrinterError(e, "E_CONNECT");
  }
}

export async function disconnect(): Promise<void> {
  if (!ThermalPrinter) return;
  try {
    await ThermalPrinter.disconnect();
  } catch {
    // Already gone.
  }
}

async function ensureConnected(printer: SelectedPrinter): Promise<void> {
  if (!isConnected()) await connect(printer);
}

/**
 * Sends bytes, reconnecting once if the link dropped since the last job — printers sleep,
 * and BLE links die silently when the phone locks.
 *
 * Only E_NOT_CONNECTED (nothing was sent) is retried. E_WRITE can fail after the printer
 * already took part of the ticket, and resending it would print a duplicate or a torn
 * ticket; the native side drops the link on a failed write, so the next job reconnects.
 */
export async function writeBytes(printer: SelectedPrinter, bytes: Uint8Array): Promise<void> {
  const module = native();
  await ensureConnected(printer);
  const payload = bytesToBase64(bytes);
  const options = WRITE_OPTIONS[printer.transport];
  try {
    await module.write(payload, options);
  } catch (first) {
    const error = toPrinterError(first);
    if (error.code !== "E_NOT_CONNECTED") throw error;
    await connect(printer);
    try {
      await module.write(payload, options);
    } catch (second) {
      throw toPrinterError(second);
    }
  }
}

export function encodeTicket(ticket: Ticket, profile: PrinterProfile, codePage?: number | null): Uint8Array {
  return getDriver(profile.driver).encode(ticket, profile, { codePage });
}

export async function printMarkup(
  printer: SelectedPrinter,
  texto: string,
  codePage?: number | null
): Promise<void> {
  const profile = resolveProfile(printer);
  await writeBytes(printer, encodeTicket(parseTicketMarkup(texto), profile, codePage));
}

/**
 * Prints a document's ticket. Connects BEFORE fetching: the fetch records the print in the
 * document's history, so an unreachable printer must fail first rather than leave a
 * "printed" entry for a ticket that never came out.
 */
export async function printDocumentTicket(printer: SelectedPrinter, noPedidoStr: string): Promise<void> {
  const profile = resolveProfile(printer);
  await ensureConnected(printer);
  const ticket = await getDocumentTicket(noPedidoStr, {
    ancho: profile.columns,
    registrarImpresion: true,
  });
  await writeBytes(printer, encodeTicket(parseTicketMarkup(ticket.texto), profile, ticket.codePage));
}

/** A self-test page: widths, styles, accents and a QR, laid out for the profile. */
export function buildTestTicketMarkup(profile: PrinterProfile, printerName?: string | null): string {
  const cols = profile.columns;
  const pair = (left: string, right: string) =>
    left + " ".repeat(Math.max(1, cols - left.length - right.length)) + right;
  const ruler = "1234567890".repeat(Math.ceil(cols / 10)).slice(0, cols);

  return [
    "<<C>><<B>><<2H>><<2W>>MSeller",
    "<<C>>Prueba de impresión",
    "<<HR>>",
    pair("Modelo", `${profile.brand} ${profile.model}`),
    printerName ? pair("Impresora", printerName.slice(0, cols - 11)) : "",
    pair("Columnas", String(cols)),
    ruler,
    "<<HR>>",
    "Normal",
    "<<B>>Negrita",
    "<<2H>>Doble alto",
    "<<2W>>Doble ancho",
    "<<C>>Centrado",
    "<<R>>Derecha",
    "<<HR>>",
    "áéíóú ÁÉÍÓÚ ñÑ ¿? ¡! ü RD$",
    "<<FEED 1>>",
    "<<QR>>https://mseller.app",
    "<<C>>Si lee este QR, la impresora funciona.",
    "<<CUT>>",
  ].join("\n");
}

export async function printTest(printer: SelectedPrinter): Promise<void> {
  const profile = resolveProfile(printer);
  await printMarkup(printer, buildTestTicketMarkup(profile, printer.name), profile.codePage);
}

/**
 * Starts a BLE scan. Devices arrive through `onDevice`; `onStop` fires once when the scan
 * ends. Returns a function that stops the scan and removes the listeners.
 */
export async function scanBle(
  timeoutMs: number,
  onDevice: (device: DiscoveredDevice) => void,
  onStop: (error: string | null) => void
): Promise<() => void> {
  const module = native();
  await ensureBluetoothPermission();

  const found = module.addListener("onDeviceFound", onDevice);
  let stopped = false;
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    found.remove();
    ended.remove();
  };
  const ended = module.addListener("onScanStopped", ({ error }) => {
    cleanup();
    onStop(error ?? null);
  });

  try {
    module.startBleScan(timeoutMs);
  } catch (e) {
    cleanup();
    throw toPrinterError(e, "E_BLUETOOTH_UNAVAILABLE");
  }

  return () => {
    if (stopped) return;
    cleanup();
    try {
      module.stopBleScan();
    } catch {
      // Nothing to stop.
    }
    onStop(null);
  };
}

export async function listBondedClassic(): Promise<DiscoveredDevice[]> {
  const module = native();
  await ensureBluetoothPermission();
  try {
    return await module.getBondedDevices();
  } catch (e) {
    throw toPrinterError(e, "E_BLUETOOTH_UNAVAILABLE");
  }
}
