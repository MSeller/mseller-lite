import { Platform } from "react-native";

/**
 * Opening a document's PDF for printing, saving or sharing.
 *
 * The PDF arrives as a Blob because the endpoint is authenticated — there is no URL we could
 * hand to the OS or to an `<a href>` that would carry the bearer token. Everything here works
 * from those bytes.
 *
 * The browser types are declared locally rather than pulled in with the `dom` lib: this is a
 * React Native project, most of it never touches a DOM, and widening `lib` would let DOM
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

interface GlobalWeb {
  window?: {
    open(url: string, destino: string): VentanaWeb | null;
    setTimeout(fn: () => void, ms: number): number;
  };
  document?: DocumentoWeb;
  URL?: { createObjectURL(blob: Blob): string; revokeObjectURL(url: string): void };
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

/**
 * Whether this build can show a PDF at all.
 *
 * False on iOS/Android today: presenting a PDF from bytes needs `expo-file-system` +
 * `expo-sharing`, which are not dependencies of this app. The UI asks this rather than
 * discovering it by throwing, so the actions are hidden instead of offered and then refused.
 * Emailing the document works on every platform — that happens on the server.
 */
export const canPresentPdf = (): boolean => esWeb && !!web.window && !!web.URL;

/**
 * A window opened synchronously inside the press handler.
 *
 * Popup blockers key on whether the window was opened during a user gesture. Awaiting the PDF
 * first and opening afterwards loses that association in Safari and Firefox, so the tab is
 * blocked even though the user asked for it. Opening an empty tab immediately and pointing it
 * at the blob once it arrives keeps the gesture intact.
 */
export const reservePrintWindow = (): VentanaWeb | null => {
  if (!canPresentPdf()) return null;
  return web.window!.open("", "_blank");
};

/**
 * Closes a reserved window that never got a document.
 *
 * Without this a failed fetch leaves the blank tab the gesture opened sitting there, and the
 * user has to clean up after an action that already told them it failed. Guarded because a
 * window the user closed first throws on `close()` in some browsers.
 */
export const releasePrintWindow = (ventana: VentanaWeb | null): void => {
  if (!ventana) return;
  try {
    ventana.close();
  } catch {
    // Already gone. Nothing to release.
  }
};

/**
 * Shows the PDF and asks the browser to print it.
 *
 * `print()` is attempted on load but deliberately not relied on: Chrome renders PDFs in a
 * plugin document whose load event does not always fire for a blob, and some viewers ignore a
 * programmatic print outright. When it doesn't fire the user still has the document open in a
 * tab with the browser's own print button — a working outcome rather than a dead end.
 */
export const printPdf = (blob: Blob, ventana: VentanaWeb | null): void => {
  if (!canPresentPdf()) throw new PdfNotSupportedError();

  const destino = ventana ?? web.window!.open("", "_blank");
  if (!destino) throw new PdfNotSupportedError();

  const url = web.URL!.createObjectURL(blob);
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

  // The object URL has to outlive the navigation, so it is released on a timer. Revoking it
  // immediately leaves the new tab pointing at nothing.
  web.window!.setTimeout(() => web.URL!.revokeObjectURL(url), 60_000);
};

/** Saves the PDF to the device under `nombreArchivo`. */
export const downloadPdf = (blob: Blob, nombreArchivo: string): void => {
  if (!canPresentPdf() || !web.document) throw new PdfNotSupportedError();

  const url = web.URL!.createObjectURL(blob);
  const enlace = web.document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  web.document.body.appendChild(enlace);
  enlace.click();
  web.document.body.removeChild(enlace);
  web.window!.setTimeout(() => web.URL!.revokeObjectURL(url), 60_000);
};

/** A filename for the saved PDF when the server did not name one. */
export const pdfFileName = (noPedidoStr: string): string =>
  `${noPedidoStr.replace(/[^A-Za-z0-9_.-]+/g, "-")}.pdf`;
