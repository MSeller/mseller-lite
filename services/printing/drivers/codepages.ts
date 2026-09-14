/**
 * Single-byte code pages a thermal printer can be switched to with `ESC t n`.
 *
 * Each table lists the Unicode character for bytes 0x80..0xFF (0x00..0x7F is ASCII in all of
 * them). Generated from Python's codecs, so they match what .NET's `Encoding.GetEncoding(n)`
 * produces on the server. U+FFFD marks a byte the code page leaves undefined.
 */

export interface CodePage {
  /** The Windows/OEM code page number the server reports (`codePage` on the ticket). */
  id: number;
  /** ESC/POS character table index for `ESC t n` (Epson numbering). */
  escPosTable: number;
  /** Characters for bytes 0x80..0xFF, 128 entries. */
  high: string;
}

const table = (rows: string[]): string => rows.join("");

export const CP437: CodePage = {
  id: 437,
  escPosTable: 0,
  high: table([
    "ÇüéâäàåçêëèïîìÄÅ",
    "ÉæÆôöòûùÿÖÜ¢£¥₧ƒ",
    "áíóúñÑªº¿⌐¬½¼¡«»",
    "░▒▓│┤╡╢╖╕╣║╗╝╜╛┐",
    "└┴┬├─┼╞╟╚╔╩╦╠═╬╧",
    "╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀",
    "αßΓπΣσµτΦΘΩδ∞φε∩",
    "≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00A0",
  ]),
};

export const CP850: CodePage = {
  id: 850,
  escPosTable: 2,
  high: table([
    "ÇüéâäàåçêëèïîìÄÅ",
    "ÉæÆôöòûùÿÖÜø£Ø×ƒ",
    "áíóúñÑªº¿®¬½¼¡«»",
    "░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐",
    "└┴┬├─┼ãÃ╚╔╩╦╠═╬¤",
    "ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀",
    "ÓßÔÒõÕµþÞÚÛÙýÝ¯´",
    "\u00AD±‗¾¶§÷¸°¨·¹³²■\u00A0",
  ]),
};

export const CP858: CodePage = {
  id: 858,
  escPosTable: 19,
  high: table([
    "ÇüéâäàåçêëèïîìÄÅ",
    "ÉæÆôöòûùÿÖÜø£Ø×ƒ",
    "áíóúñÑªº¿®¬½¼¡«»",
    "░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐",
    "└┴┬├─┼ãÃ╚╔╩╦╠═╬¤",
    "ðÐÊËÈ€ÍÎÏ┘┌█▄¦Ì▀",
    "ÓßÔÒõÕµþÞÚÛÙýÝ¯´",
    "\u00AD±‗¾¶§÷¸°¨·¹³²■\u00A0",
  ]),
};

export const WPC1252: CodePage = {
  id: 1252,
  escPosTable: 16,
  high: table([
    "€\uFFFD‚ƒ„…†‡ˆ‰Š‹Œ\uFFFDŽ\uFFFD",
    "\uFFFD‘’“”•–—˜™š›œ\uFFFDžŸ",
    "\u00A0¡¢£¤¥¦§¨©ª«¬\u00AD®¯",
    "°±²³´µ¶·¸¹º»¼½¾¿",
    "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏ",
    "ÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞß",
    "àáâãäåæçèéêëìíîï",
    "ðñòóôõö÷øùúûüýþÿ",
  ]),
};

const BY_ID: Record<number, CodePage> = {
  437: CP437,
  850: CP850,
  858: CP858,
  1252: WPC1252,
};

/**
 * The code page for a server-reported id. Anything the app has no table for falls back to
 * CP850 — the same default as core-api's `EscPosReceiptBuilder` — and the printer is told
 * CP850 too, so bytes and glyph table never disagree.
 */
export const resolveCodePage = (id: number | null | undefined): CodePage =>
  (id != null && BY_ID[id]) || CP850;

/**
 * Characters common in Spanish business text that some code pages lack, spelled with ones
 * every page has. Tried after the table and before stripping accents.
 */
const SUBSTITUTES: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‚": ",",
  "“": '"',
  "”": '"',
  "„": '"',
  "–": "-",
  "—": "-",
  "…": "...",
  "•": "*",
  "€": "EUR",
  " ": " ",
  "\t": " ",
};

const reverseCache = new Map<number, Map<string, number>>();

const reverseOf = (page: CodePage): Map<string, number> => {
  let map = reverseCache.get(page.id);
  if (!map) {
    map = new Map();
    for (let i = 0; i < 128; i++) {
      const ch = page.high[i];
      if (ch !== "�" && !map.has(ch)) map.set(ch, 0x80 + i);
    }
    reverseCache.set(page.id, map);
  }
  return map;
};

/**
 * Encodes text into the code page's bytes. A character the page cannot represent is
 * substituted (curly quotes → straight), then stripped of its accent (ş → s), and only then
 * printed as `?` — a close spelling beats a wrong glyph on a customer's receipt.
 */
export function encodeText(text: string, page: CodePage): number[] {
  const reverse = reverseOf(page);
  const out: number[] = [];

  const pushChar = (ch: string, depth: number): void => {
    const code = ch.codePointAt(0) ?? 0x3f;
    if (code >= 0x20 && code < 0x7f) {
      out.push(code);
      return;
    }
    const mapped = reverse.get(ch);
    if (mapped !== undefined) {
      out.push(mapped);
      return;
    }
    if (depth === 0) {
      const sub = SUBSTITUTES[ch];
      if (sub !== undefined) {
        for (const c of sub) pushChar(c, 1);
        return;
      }
      const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (base && base !== ch) {
        for (const c of base) pushChar(c, 1);
        return;
      }
    }
    // Control characters (including a stray LF inside a line) must never reach the printer
    // as commands.
    out.push(0x3f);
  };

  for (const ch of text) pushChar(ch, 0);
  return out;
}
