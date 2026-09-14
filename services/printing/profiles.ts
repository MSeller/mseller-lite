import type { TransportKind } from "./transports/types";

export type DriverId = "escpos";

/**
 * What the app needs to know about a printer model to print on it.
 *
 * Adding a model is adding a preset here; adding a brand that speaks another language (ZPL,
 * Star Line Mode…) is adding a driver in `drivers/` and pointing a preset's `driver` at it.
 */
export interface PrinterProfile {
  id: string;
  brand: string;
  model: string;
  paperWidthMm: 58 | 80;
  /** Printable dots across the head (8 dots/mm): 384 on 58mm, 576 on 80mm. */
  dotsPerLine: number;
  /** Characters per line in font A: the `ancho` the server lays the ticket out for. */
  columns: 32 | 48;
  /** Default code page when the server does not say. The server's `codePage` wins. */
  codePage: number;
  driver: DriverId;
  /**
   * Whether the firmware implements `GS ( k` QR. When false the QR is drawn as a raster
   * image (`GS v 0`), which every ESC/POS printer understands.
   */
  nativeQr: boolean;
  hasCutter: boolean;
  /** QR module size in dots. The raster fallback shrinks it if the symbol would not fit. */
  qrModuleSize: number;
  transports: TransportKind[];
}

export const PRINTER_PROFILES: PrinterProfile[] = [
  {
    id: "2connect-58",
    brand: "2Connect",
    model: "58 mm",
    paperWidthMm: 58,
    dotsPerLine: 384,
    columns: 32,
    codePage: 850,
    driver: "escpos",
    // Portable 58mm units vary in firmware; the raster QR prints on all of them.
    nativeQr: false,
    hasCutter: false,
    qrModuleSize: 4,
    transports: ["ble", "bt-classic"],
  },
  {
    id: "2connect-80",
    brand: "2Connect",
    model: "80 mm",
    paperWidthMm: 80,
    dotsPerLine: 576,
    columns: 48,
    codePage: 850,
    driver: "escpos",
    nativeQr: true,
    hasCutter: true,
    qrModuleSize: 5,
    transports: ["ble", "bt-classic", "tcp"],
  },
  {
    id: "generic-escpos-58",
    brand: "ESC/POS",
    model: "58 mm",
    paperWidthMm: 58,
    dotsPerLine: 384,
    columns: 32,
    codePage: 850,
    driver: "escpos",
    nativeQr: false,
    hasCutter: false,
    qrModuleSize: 4,
    transports: ["ble", "bt-classic", "tcp"],
  },
  {
    id: "generic-escpos-80",
    brand: "ESC/POS",
    model: "80 mm",
    paperWidthMm: 80,
    dotsPerLine: 576,
    columns: 48,
    codePage: 850,
    driver: "escpos",
    nativeQr: false,
    hasCutter: true,
    qrModuleSize: 5,
    transports: ["ble", "bt-classic", "tcp"],
  },
];

export const DEFAULT_PROFILE_ID = "2connect-58";

export const getPrinterProfile = (id: string | null | undefined): PrinterProfile | undefined =>
  PRINTER_PROFILES.find((profile) => profile.id === id);
