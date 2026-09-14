import createQrCode from "qrcode-generator";

export interface QrMatrix {
  size: number;
  /** Row-major, `true` = dark module. */
  isDark(row: number, col: number): boolean;
}

/**
 * The QR symbol for `data` at error-correction level M (the level the ESC/POS `GS ( k` path
 * asks the printer for), used by the raster fallback and the on-screen preview. Bytes are
 * UTF-8, matching what the native path sends. Returns null when the data does not fit any
 * QR version.
 */
export function buildQrMatrix(data: string): QrMatrix | null {
  try {
    const qr = createQrCode(0, "M");
    qr.addData(utf8Binary(data), "Byte");
    qr.make();
    const size = qr.getModuleCount();
    return { size, isDark: (row, col) => qr.isDark(row, col) };
  } catch {
    return null;
  }
}

/**
 * qrcode-generator's Byte mode takes one byte per char code (it masks with 0xFF), so text is
 * handed over as a "binary string" of its UTF-8 bytes. ASCII — which covers the fiscal URLs
 * printed today — is unchanged.
 */
function utf8Binary(text: string): string {
  let out = "";
  for (const byte of utf8Bytes(text)) out += String.fromCharCode(byte);
  return out;
}

export function utf8Bytes(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0x3f;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 63),
        0x80 | ((cp >> 6) & 63),
        0x80 | (cp & 63)
      );
  }
  return out;
}
