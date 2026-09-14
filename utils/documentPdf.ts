import { Platform } from "react-native";

import { hasNativeModules } from "./nativeModules";

/**
 * Opening a document's PDF for printing, saving or sharing.
 *
 * The PDF arrives as raw bytes because the endpoint is authenticated — there is no URL we
 * could hand to the OS or to an `<a href>` that would carry the bearer token. Everything
 * here works from those bytes, and the two platforms need genuinely different machinery:
 *
 * - **Web**: an object URL in a tab the browser prints, and an `<a download>` to save.
 * - **iOS/Android**: the bytes go to a cache file, which `expo-print` prints through the
 *   OS print dialog and `expo-sharing` hands to the share sheet.
 *
 * The browser types are declared locally rather than pulled in with the `dom` lib: this is
 * a React Native project, most of it never touches a DOM, and widening `lib` would let DOM
 * globals typecheck in files that run on a phone where they do not exist.
 */

interface VentanaWeb {
  location: { href: string };
  focus(): void;
  print(): void;
  close(): void;
  addEventListener(tipo: string, escucha: () => void): void;
}

interface DocumentoWeb {
  createElement(tag: "a"): {
    href: string;
    download: string;
    click(): void;
  };
  body: { appendChild(nodo: unknown): void; removeChild(nodo: unknown): void };
}

/**
 * The browser's Blob, declared here rather than reusing the global one.
 *
 * React Native ships its own `Blob` whose constructor takes only `string | Blob` parts —
 * it has no `ArrayBuffer` overload, because on a phone there is no DOM Blob to build from
 * bytes. Referring to the global therefore fails to typecheck for the bytes we hold, on a
 * code path that only ever runs on the web where the real DOM Blob does exist. Declaring
 * it locally keeps this shim self-consistent, exactly like the rest of the file.
 */
interface BlobWeb {
  readonly size: number;
  readonly type: string;
}

interface GlobalWeb {
  window?: {
    open(url: string, destino: string): VentanaWeb | null;
    setTimeout(fn: () => void, ms: number): number;
  };
  document?: DocumentoWeb;
  Blob?: new (partes: ArrayBuffer[], opciones?: { type?: string }) => BlobWeb;
  URL?: { createObjectURL(blob: BlobWeb): string; revokeObjectURL(url: string): void };
}

const web = globalThis as unknown as GlobalWeb;

/** Thrown when the platform has no way to present a PDF. The UI turns this into a message. */
export class PdfNotSupportedError extends Error {
  constructor() {
    super("PDF_NOT_SUPPORTED");
    this.name = "PdfNotSupportedError";
  }
}

const esWeb = Platform.OS === "web";

// ── Native modules ──────────────────────────────────────────────────────────

type ModulosNativos = {
  Print: typeof import("expo-print");
  Sharing: typeof import("expo-sharing");
  FileSystem: typeof import("expo-file-system");
};

/**
 * The native side of each package, by the name its JS asks for. Kept next to the check
 * because a rename here on an SDK upgrade is exactly what would silently hide printing.
 */
const MODULOS_NATIVOS_REQUERIDOS = ["ExpoPrint", "ExpoSharing", "FileSystem"] as const;

/**
 * `undefined` = not tried yet, `null` = unavailable on this build.
 *
 * These are NATIVE modules: an app binary built before they were added to package.json
 * does not contain them. Presence is checked with `requireOptionalNativeModule`, which
 * answers null, BEFORE any of the three packages is required.
 *
 * Wrapping the `require` in a try/catch is not enough, and an earlier version of this
 * file relied on it. At runtime Metro's own module loader catches an error thrown while a
 * module evaluates, reports it to the error overlay, and hands back `undefined` — the
 * catch block never runs. `expo-sharing` throws "Cannot find native module
 * 'ExpoSharing'" as it evaluates, so an old binary got a red error screen and, worse, a
 * modules object with `Sharing: undefined` that read as "available" and put a Print
 * button on screen that could only crash.
 */
let nativos: ModulosNativos | null | undefined;

const cargarNativos = (): ModulosNativos | null => {
  if (nativos !== undefined) return nativos;

  if (esWeb || !hasNativeModules(...MODULOS_NATIVOS_REQUERIDOS)) {
    nativos = null;
    return nativos;
  }

  // Safe to require now: every native half is present, so none of these throw on load.
  nativos = {
    Print: require("expo-print"),
    Sharing: require("expo-sharing"),
    FileSystem: require("expo-file-system"),
  };
  return nativos;
};

/**
 * Writes the PDF where the OS can reach it.
 *
 * Cache rather than documents: this file exists to be handed to the print dialog or the
 * share sheet and has no value afterwards, and the OS may reclaim the cache directory
 * whenever it likes. Overwriting by document number keeps one file per document instead of
 * a pile of copies accumulating on the device.
 */
const escribirTemporal = (
  modulos: ModulosNativos,
  bytes: ArrayBuffer,
  nombreArchivo: string
): string => {
  const { File, Paths } = modulos.FileSystem;
  const archivo = new File(Paths.cache, nombreArchivo);

  archivo.create({ overwrite: true, intermediates: true });
  archivo.write(new Uint8Array(bytes));

  return archivo.uri;
};

// ── Capability ──────────────────────────────────────────────────────────────

/**
 * Whether this build can show a PDF at all.
 *
 * On the phone this is true once `expo-print` / `expo-sharing` / `expo-file-system` are in
 * the binary — which needs a dev-client or store rebuild after they were added, not just a
 * JS reload. The UI asks this rather than discovering it by throwing, so the actions are
 * hidden instead of offered and then refused. Emailing the document works regardless; that
 * happens on the server.
 */
export const canPresentPdf = (): boolean =>
  esWeb ? !!web.window && !!web.URL && !!web.Blob : cargarNativos() !== null;

// ── Print ───────────────────────────────────────────────────────────────────

/**
 * What a print is about to go to, decided BEFORE the bytes are fetched.
 *
 * `bloqueado` is web-only and specific: the browser refused the tab. It has to be
 * distinguishable from "this platform cannot show PDFs", because the caller must not go on
 * to request the PDF — that request records a print, and the history would then claim a
 * copy the user never saw.
 */
export type ReservaImpresion =
  | { estado: "listo"; ventana: VentanaWeb | null }
  | { estado: "bloqueado" }
  | { estado: "noDisponible" };

/**
 * Reserves wherever the PDF is going to be shown.
 *
 * On the web this opens the tab synchronously, inside the press handler. Popup blockers
 * key on whether the window was opened during a user gesture; awaiting the PDF first and
 * opening afterwards loses that association in Safari and Firefox, so the tab is blocked
 * even though the user asked for it. Opening an empty tab immediately and pointing it at
 * the blob once it arrives keeps the gesture intact.
 *
 * On the phone there is nothing to reserve — the OS print dialog is raised after the bytes
 * arrive and no popup blocker is involved — so this only reports whether printing is
 * possible at all.
 */
export const reservePrintTarget = (): ReservaImpresion => {
  if (!canPresentPdf()) return { estado: "noDisponible" };

  if (!esWeb) return { estado: "listo", ventana: null };

  const ventana = web.window!.open("", "_blank");
  return ventana ? { estado: "listo", ventana } : { estado: "bloqueado" };
};

/**
 * Closes a reserved window that never got a document.
 *
 * Without this a failed fetch leaves the blank tab the gesture opened sitting there, and
 * the user has to clean up after an action that already told them it failed. Guarded
 * because a window the user closed first throws on `close()` in some browsers. A no-op on
 * the phone, where nothing was opened ahead of time.
 */
export const releasePrintWindow = (reserva: ReservaImpresion | null): void => {
  const ventana = reserva?.estado === "listo" ? reserva.ventana : null;
  if (!ventana) return;

  try {
    ventana.close();
  } catch {
    // Already gone. Nothing to release.
  }
};

/**
 * Shows the PDF and asks to print it.
 *
 * On the web, `print()` is attempted on load but deliberately not relied on: Chrome
 * renders PDFs in a plugin document whose load event does not always fire for a blob, and
 * some viewers ignore a programmatic print outright. When it doesn't fire the user still
 * has the document open in a tab with the browser's own print button — a working outcome
 * rather than a dead end.
 *
 * On the phone `expo-print` raises the system print dialog directly, which is the real
 * thing: AirPrint, a nearby network printer, or "Save to Files" / "Save as PDF".
 */
export const printPdf = async (
  bytes: ArrayBuffer,
  reserva: ReservaImpresion,
  nombreArchivo: string
): Promise<void> => {
  if (reserva.estado !== "listo") throw new PdfNotSupportedError();

  if (!esWeb) {
    const modulos = cargarNativos();
    if (!modulos) throw new PdfNotSupportedError();

    const uri = escribirTemporal(modulos, bytes, nombreArchivo);
    await modulos.Print.printAsync({ uri });
    return;
  }

  if (!web.window || !web.URL || !web.Blob) throw new PdfNotSupportedError();

  const destino = reserva.ventana ?? web.window.open("", "_blank");
  if (!destino) throw new PdfNotSupportedError();

  const url = web.URL.createObjectURL(new web.Blob!([bytes], { type: "application/pdf" }));
  destino.location.href = url;

  try {
    destino.addEventListener("load", () => {
      try {
        destino.focus();
        destino.print();
      } catch {
        // Viewer refused a programmatic print; the tab is open, which is enough.
      }
    });
  } catch {
    // A blob document that won't take a listener. Same conclusion.
  }

  // The object URL has to outlive the navigation, so it is released on a timer. Revoking
  // it immediately leaves the new tab pointing at nothing.
  web.window.setTimeout(() => web.URL!.revokeObjectURL(url), 60_000);
};

// ── Save ────────────────────────────────────────────────────────────────────

/**
 * Saves the PDF under `nombreArchivo`: a download on the web, the system share sheet on
 * the phone — which is where "Save to Files", Mail, WhatsApp and the rest live, so it is
 * the same intent expressed the way each platform expresses it.
 */
export const downloadPdf = async (bytes: ArrayBuffer, nombreArchivo: string): Promise<void> => {
  if (!esWeb) {
    const modulos = cargarNativos();
    if (!modulos) throw new PdfNotSupportedError();

    // Asked rather than assumed: sharing is genuinely unavailable on some configurations
    // (a simulator without the sheet, a locked-down device), and finding out by throwing
    // after writing the file tells the user less.
    if (!(await modulos.Sharing.isAvailableAsync())) throw new PdfNotSupportedError();

    const uri = escribirTemporal(modulos, bytes, nombreArchivo);
    await modulos.Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      // iOS picks the app list from the UTI, not the MIME type; without it the sheet
      // offers far less than it could for a PDF.
      UTI: "com.adobe.pdf",
      dialogTitle: nombreArchivo,
    });
    return;
  }

  if (!web.document || !web.window || !web.URL || !web.Blob) throw new PdfNotSupportedError();

  const url = web.URL.createObjectURL(new web.Blob!([bytes], { type: "application/pdf" }));
  const enlace = web.document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  web.document.body.appendChild(enlace);
  enlace.click();
  web.document.body.removeChild(enlace);
  web.window.setTimeout(() => web.URL!.revokeObjectURL(url), 60_000);
};

/** A filename for the saved PDF when the server did not name one. */
export const pdfFileName = (noPedidoStr: string): string =>
  `${noPedidoStr.replace(/[^A-Za-z0-9_.-]+/g, "-")}.pdf`;
