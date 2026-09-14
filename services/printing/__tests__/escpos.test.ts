import { describe, expect, it } from "@jest/globals";

import { bytesToBase64 } from "../bytes";
import { CP850, WPC1252, encodeText, resolveCodePage } from "../drivers/codepages";
import { encodeEscPos } from "../drivers/escpos";
import { parseTicketMarkup } from "../markup/parse";
import { getPrinterProfile, type PrinterProfile } from "../profiles";

const P58 = getPrinterProfile("generic-escpos-58") as PrinterProfile;
const P80 = getPrinterProfile("generic-escpos-80") as PrinterProfile;

const INIT_850 = [0x1b, 0x40, 0x1c, 0x2e, 0x1b, 0x52, 0x00, 0x1b, 0x74, 0x02];
const FEED4 = [0x0a, 0x0a, 0x0a, 0x0a];
const CUT = [0x1d, 0x56, 66, 0];

const enc = (text: string, profile: PrinterProfile, codePage?: number) =>
  Array.from(encodeEscPos(parseTicketMarkup(text), profile, { codePage }));

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

describe("encodeEscPos", () => {
  it("wraps a line in init, code page, trailing feed and cut", () => {
    expect(enc("Hola", P80)).toEqual([...INIT_850, ...ascii("Hola"), 0x0a, ...FEED4, ...CUT]);
  });

  it("does not cut when the printer has no cutter", () => {
    expect(enc("Hola\n<<CUT>>\nAdios", P58)).toEqual([
      ...INIT_850,
      ...ascii("Hola"),
      0x0a,
      ...ascii("Adios"),
      0x0a,
      ...FEED4,
    ]);
  });

  it("cuts mid-ticket on <<CUT>> but not twice at the end", () => {
    expect(enc("A\n<<CUT>>\nB\n<<CUT>>", P80)).toEqual([
      ...INIT_850,
      0x41,
      0x0a,
      ...CUT,
      0x42,
      0x0a,
      ...FEED4,
      ...CUT,
    ]);
  });

  it("selects the ESC t table for the server's code page", () => {
    expect(enc("", P80, 858).slice(0, 10)).toEqual([0x1b, 0x40, 0x1c, 0x2e, 0x1b, 0x52, 0x00, 0x1b, 0x74, 19]);
    expect(enc("", P80, 437)[9]).toBe(0);
    expect(enc("", P80, 1252)[9]).toBe(16);
    // No table for 852 in the app: CP850 for both the bytes and the printer.
    expect(enc("", P80, 852)[9]).toBe(2);
  });

  it("emits and resets alignment, bold and size per line", () => {
    const body = enc("<<C>><<B>><<2H>><<2W>>X\n<<R>>Y", P80).slice(
      INIT_850.length,
      -(FEED4.length + CUT.length)
    );
    expect(body).toEqual([
      0x1b, 0x61, 1, 0x1b, 0x45, 1, 0x1d, 0x21, 0x11, 0x58, 0x0a, 0x1d, 0x21, 0, 0x1b, 0x45, 0, 0x1b, 0x61, 0,
      0x1b, 0x61, 2, 0x59, 0x0a, 0x1b, 0x61, 0,
    ]);
  });

  it("uses 0x10 for double width and 0x01 for double height", () => {
    expect(enc("<<2W>>A", P58).slice(INIT_850.length, INIT_850.length + 3)).toEqual([0x1d, 0x21, 0x10]);
    expect(enc("<<2H>>A", P58).slice(INIT_850.length, INIT_850.length + 3)).toEqual([0x1d, 0x21, 0x01]);
  });

  it("draws the separator at the profile's column count", () => {
    const hr58 = enc("<<HR>>", P58).slice(INIT_850.length, -FEED4.length);
    const hr80 = enc("<<HR>>", P80).slice(INIT_850.length, -(FEED4.length + CUT.length));
    expect(hr58).toEqual([...new Array(32).fill(0x2d), 0x0a]);
    expect(hr80).toEqual([...new Array(48).fill(0x2d), 0x0a]);
  });

  it("feeds n lines", () => {
    expect(enc("<<FEED 2>>", P58).slice(INIT_850.length)).toEqual([0x0a, 0x0a, ...FEED4]);
  });

  it("encodes Spanish characters in CP850", () => {
    const body = enc("áéíóúñÑ¿¡ÁÉÍÓÚü", P58).slice(
      INIT_850.length,
      -(1 + FEED4.length)
    );
    // á é í ó ú ñ Ñ ¿ ¡ Á É Í Ó Ú ü
    expect(body).toEqual([0xa0, 0x82, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0xa8, 0xad, 0xb5, 0x90, 0xd6, 0xe0, 0xe9, 0x81]);
  });

  it("encodes the same characters in WPC1252", () => {
    expect(encodeText("áéíóúñÑ¿¡", WPC1252)).toEqual([
      0xe1, 0xe9, 0xed, 0xf3, 0xfa, 0xf1, 0xd1, 0xbf, 0xa1,
    ]);
  });

  it("substitutes, strips accents, then falls back to ?", () => {
    // Curly quotes, en dash and ellipsis.
    expect(encodeText("“RD$” – …", CP850)).toEqual(ascii('"RD$" - ...'));
    // s with cedilla has no CP850 glyph; its base letter does.
    expect(encodeText("ş", CP850)).toEqual(ascii("s"));
    expect(encodeText("€", CP850)).toEqual(ascii("EUR"));
    expect(encodeText("€", resolveCodePage(858))).toEqual([0xd5]);
    // A CJK character and a BEL control character.
    expect(encodeText("中", CP850)).toEqual(ascii("??"));
  });

  it("prints a native QR with GS ( k: model 2, module size, ECC M", () => {
    const profile: PrinterProfile = { ...P80, nativeQr: true, qrModuleSize: 6 };
    const data = "https://ecf.dgii.gov.do/x";
    const body = enc(`<<QR>>${data}`, profile).slice(INIT_850.length, -(FEED4.length + CUT.length));
    const len = data.length + 3;
    expect(body).toEqual([
      0x1b, 0x61, 1,
      0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
      0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 6,
      0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31,
      0x1d, 0x28, 0x6b, len & 0xff, len >> 8, 0x31, 0x50, 0x30, ...ascii(data),
      0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30,
      0x0a,
      0x1b, 0x61, 0,
    ]);
  });

  it("falls back to a centered GS v 0 raster that fits the paper", () => {
    const profile: PrinterProfile = { ...P58, nativeQr: false, qrModuleSize: 4 };
    const body = enc("<<QR>>HELLO", profile).slice(INIT_850.length, -FEED4.length);
    expect(body.slice(0, 3)).toEqual([0x1b, 0x61, 1]);
    expect(body.slice(3, 7)).toEqual([0x1d, 0x76, 0x30, 0x00]);
    const widthBytes = body[7] | (body[8] << 8);
    const height = body[9] | (body[10] << 8);
    expect(widthBytes).toBe(48); // 384 dots
    // Version 1 (21 modules) plus a 2-module quiet zone each side, 4 dots per module.
    expect(height).toBe(25 * 4);
    const raster = body.slice(11, 11 + widthBytes * height);
    expect(raster).toHaveLength(widthBytes * height);
    expect(body.slice(11 + widthBytes * height)).toEqual([0x0a, 0x1b, 0x61, 0]);

    // The quiet-zone rows are white.
    expect(raster.slice(0, widthBytes * 8).every((b) => b === 0)).toBe(true);
    // The finder pattern's top-left dot sits at the centered symbol offset + quiet zone.
    const row = raster.slice(widthBytes * 8, widthBytes * 9);
    const byteIndex = row.findIndex((b) => b !== 0);
    const firstDot = byteIndex * 8 + (Math.clz32(row[byteIndex]) - 24);
    expect(firstDot).toBe((384 - 100) / 2 + 8);
  });

  it("shrinks the raster QR modules so long data still fits 58mm", () => {
    const profile: PrinterProfile = { ...P58, nativeQr: false, qrModuleSize: 8 };
    const body = enc(`<<QR>>https://ecf.dgii.gov.do/ecf/consultatimbre?${"x".repeat(180)}`, profile);
    const start = INIT_850.length + 3;
    expect(body.slice(start, start + 4)).toEqual([0x1d, 0x76, 0x30, 0x00]);
    const widthBytes = body[start + 4] | (body[start + 5] << 8);
    const height = body[start + 6] | (body[start + 7] << 8);
    expect(widthBytes * 8).toBe(384);
    expect(height).toBeGreaterThan(0);
    expect(height).toBeLessThanOrEqual(384);
  });
});

describe("bytesToBase64", () => {
  it("matches Buffer's encoding for every padding case", () => {
    for (const len of [0, 1, 2, 3, 4, 5, 255]) {
      const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 37) & 0xff);
      expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
    }
  });
});

describe("encodeEscPos on a core-api fixture", () => {
  it("encodes the e-CF ticket for 58mm without unmappable characters and with a raster QR", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require("fs") as typeof import("fs");
    const texto = readFileSync(`${__dirname}/fixtures/invoice-ecf-32.txt`, "utf8");
    const profile = getPrinterProfile("2connect-58") as PrinterProfile;
    const ticket = parseTicketMarkup(texto);
    const bytes = Array.from(encodeEscPos(ticket, profile, { codePage: 850 }));

    // Every character of every text line has a CP850 byte: no "?" the source did not have.
    for (const node of ticket.nodes) {
      if (node.kind !== "text") continue;
      const encoded = encodeText(node.text, CP850);
      expect(encoded).toHaveLength(node.text.length);
      expect(encoded.filter((b) => b === 0x3f)).toHaveLength((node.text.match(/\?/g) ?? []).length);
    }
    // Raster QR present, no cut on a printer without cutter.
    expect(bytes.join(",")).toContain([0x1d, 0x76, 0x30, 0x00].join(","));
    expect(bytes.slice(-4)).toEqual(FEED4);
  });
});
