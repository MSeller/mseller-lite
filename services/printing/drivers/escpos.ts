import type { Ticket, TicketNode, TicketTextStyle } from "../markup/types";
import type { PrinterProfile } from "../profiles";
import { buildQrMatrix, utf8Bytes } from "../qr";
import { encodeText, resolveCodePage } from "./codepages";
import type { EncodeOptions, PrinterDriver } from "./types";

const ESC = 0x1b;
const GS = 0x1d;
const FS = 0x1c;
const LF = 0x0a;

/** Blank lines after the last content so it clears the tear bar / cutter. */
const TRAILING_FEED = 4;
/** White modules around the raster QR: the spec asks for 4, printers' margins help. */
const QR_QUIET_ZONE = 2;

/**
 * ESC/POS encoder for the ticket tree.
 *
 * The shared parts — init sequence, `ESC t` table selection, code page encoding, trailing
 * feed and `GS V 66 0` cut, `GS ( k` QR — match core-api's `EscPosReceiptBuilder`, so a
 * ticket prints the same whether it goes out through mseller-bridge or from the phone.
 */
export function encodeEscPos(
  ticket: Ticket,
  profile: PrinterProfile,
  options: EncodeOptions = {}
): Uint8Array {
  const page = resolveCodePage(options.codePage ?? profile.codePage);
  const out: number[] = [];
  const push = (...bytes: number[]) => {
    for (const b of bytes) out.push(b);
  };

  // ESC @ initialize · FS . cancel Kanji mode (Chinese firmwares otherwise swallow bytes
  // >= 0x80 as double-byte lead bytes) · ESC R 0 USA charset (keeps 0x24 as "$" for RD$) ·
  // ESC t n character table matching the encoding below.
  push(ESC, 0x40, FS, 0x2e, ESC, 0x52, 0, ESC, 0x74, page.escPosTable);

  // A trailing <<CUT>> is the same cut the ticket ends with anyway; emitting both would cut
  // a blank sliver of paper.
  const nodes = ticket.nodes;
  const last = nodes.length > 0 && nodes[nodes.length - 1].kind === "cut" ? nodes.length - 1 : nodes.length;

  for (let i = 0; i < last; i++) {
    writeNode(nodes[i], profile, page, push, out);
  }

  for (let i = 0; i < TRAILING_FEED; i++) push(LF);
  if (profile.hasCutter) push(GS, 0x56, 66, 0);

  return Uint8Array.from(out);
}

function writeNode(
  node: TicketNode,
  profile: PrinterProfile,
  page: ReturnType<typeof resolveCodePage>,
  push: (...bytes: number[]) => void,
  out: number[]
): void {
  switch (node.kind) {
    case "text":
      writeText(node.text, node.style, page, push, out);
      return;
    case "hr":
      for (let i = 0; i < profile.columns; i++) push(0x2d);
      push(LF);
      return;
    case "feed":
      for (let i = 0; i < node.lines; i++) push(LF);
      return;
    case "cut":
      // GS V 66 0: feed to the cutter and partial cut.
      if (profile.hasCutter) push(GS, 0x56, 66, 0);
      return;
    case "qr":
      push(ESC, 0x61, 1);
      if (profile.nativeQr) writeNativeQr(node.data, profile.qrModuleSize, push, out);
      else writeRasterQr(node.data, profile, push, out);
      push(ESC, 0x61, 0);
      return;
  }
}

const ALIGN_BYTE = { left: 0, center: 1, right: 2 } as const;

function writeText(
  text: string,
  style: TicketTextStyle,
  page: ReturnType<typeof resolveCodePage>,
  push: (...bytes: number[]) => void,
  out: number[]
): void {
  const size = (style.doubleWidth ? 0x10 : 0) | (style.doubleHeight ? 0x01 : 0);

  if (style.align !== "left") push(ESC, 0x61, ALIGN_BYTE[style.align]);
  if (style.bold) push(ESC, 0x45, 1);
  if (size) push(GS, 0x21, size);

  for (const b of encodeText(text, page)) out.push(b);
  push(LF);

  // Reset per line so no state leaks into the next one.
  if (size) push(GS, 0x21, 0);
  if (style.bold) push(ESC, 0x45, 0);
  if (style.align !== "left") push(ESC, 0x61, 0);
}

/** `GS ( k`: model 2, module size n, error correction M, store, print. */
function writeNativeQr(data: string, moduleSize: number, push: (...b: number[]) => void, out: number[]) {
  const payload = utf8Bytes(data);
  const storeLen = payload.length + 3;
  if (storeLen > 0xffff) return;

  const n = Math.max(1, Math.min(16, Math.round(moduleSize)));
  push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
  push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, n);
  push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
  push(GS, 0x28, 0x6b, storeLen & 0xff, (storeLen >> 8) & 0xff, 0x31, 0x50, 0x30);
  for (const b of payload) out.push(b);
  push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
  push(LF);
}

/**
 * The QR drawn as a `GS v 0` raster image, for firmwares without `GS ( k`. The image spans
 * the full printable width with the symbol centered inside it, so centering does not depend
 * on whether the firmware applies `ESC a` to images.
 */
function writeRasterQr(
  data: string,
  profile: PrinterProfile,
  push: (...b: number[]) => void,
  out: number[]
) {
  const matrix = buildQrMatrix(data);
  if (!matrix) return;

  const widthDots = Math.floor(profile.dotsPerLine / 8) * 8;
  const modulesWide = matrix.size + QR_QUIET_ZONE * 2;
  const scale = Math.max(1, Math.min(profile.qrModuleSize, Math.floor(widthDots / modulesWide)));
  const symbolDots = modulesWide * scale;
  if (symbolDots > widthDots) return;

  const bytesPerRow = widthDots / 8;
  const heightDots = symbolDots;
  const left = Math.floor((widthDots - symbolDots) / 2);

  push(GS, 0x76, 0x30, 0x00, bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff, heightDots & 0xff, (heightDots >> 8) & 0xff);

  const row = new Array<number>(bytesPerRow);
  for (let y = 0; y < heightDots; y++) {
    row.fill(0);
    const moduleRow = Math.floor(y / scale) - QR_QUIET_ZONE;
    if (moduleRow >= 0 && moduleRow < matrix.size) {
      for (let x = 0; x < symbolDots; x++) {
        const moduleCol = Math.floor(x / scale) - QR_QUIET_ZONE;
        if (moduleCol >= 0 && moduleCol < matrix.size && matrix.isDark(moduleRow, moduleCol)) {
          const dot = left + x;
          row[dot >> 3] |= 0x80 >> (dot & 7);
        }
      }
    }
    for (const b of row) out.push(b);
  }
  push(LF);
}

export const escPosDriver: PrinterDriver = {
  id: "escpos",
  encode: encodeEscPos,
};
