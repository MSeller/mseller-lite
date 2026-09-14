import { describe, expect, it } from "@jest/globals";

import { parseTicketMarkup } from "../markup/parse";
import { PLAIN_STYLE } from "../markup/types";

describe("parseTicketMarkup", () => {
  it("reads plain lines with the default style", () => {
    expect(parseTicketMarkup("Hola\nMundo").nodes).toEqual([
      { kind: "text", text: "Hola", style: PLAIN_STYLE },
      { kind: "text", text: "Mundo", style: PLAIN_STYLE },
    ]);
  });

  it("stacks markers and resets style at the end of the line", () => {
    const { nodes } = parseTicketMarkup("<<C>><<B>><<2H>><<2W>>TOTAL\nsiguiente");
    expect(nodes[0]).toEqual({
      kind: "text",
      text: "TOTAL",
      style: { align: "center", bold: true, doubleHeight: true, doubleWidth: true },
    });
    expect(nodes[1]).toEqual({ kind: "text", text: "siguiente", style: PLAIN_STYLE });
  });

  it("treats <<CB>> as center + bold", () => {
    expect(parseTicketMarkup("<<CB>>COMERCIAL, ZYL").nodes[0]).toEqual({
      kind: "text",
      text: "COMERCIAL, ZYL",
      style: { ...PLAIN_STYLE, align: "center", bold: true },
    });
  });

  it("right aligns with <<R>>", () => {
    expect(parseTicketMarkup("<<R>>100.00").nodes[0]).toMatchObject({ style: { align: "right" } });
  });

  it("strips unknown markers instead of printing them", () => {
    expect(parseTicketMarkup("<<ZOOM>><<B>>Texto").nodes).toEqual([
      { kind: "text", text: "Texto", style: { ...PLAIN_STYLE, bold: true } },
    ]);
    // A line made only of unknown markers prints nothing.
    expect(parseTicketMarkup("<<NUEVO>>").nodes).toEqual([]);
  });

  it("only reads markers at the start of the line", () => {
    expect(parseTicketMarkup("Precio <<B>> 10").nodes[0]).toEqual({
      kind: "text",
      text: "Precio <<B>> 10",
      style: PLAIN_STYLE,
    });
    // An unterminated "<<" is content.
    expect(parseTicketMarkup("<<abc").nodes[0]).toMatchObject({ kind: "text", text: "<<abc" });
  });

  it("parses block markers and ignores the rest of the line", () => {
    expect(parseTicketMarkup("<<HR>>ignorado\n<<CUT>>x\n<<FEED 3>>y").nodes).toEqual([
      { kind: "hr" },
      { kind: "cut" },
      { kind: "feed", lines: 3 },
    ]);
  });

  it("ignores style markers before a block marker", () => {
    expect(parseTicketMarkup("<<C>><<B>><<HR>>").nodes).toEqual([{ kind: "hr" }]);
    expect(parseTicketMarkup("<<C>><<QR>>https://x.do/a").nodes).toEqual([
      { kind: "qr", data: "https://x.do/a" },
    ]);
  });

  it("takes the trimmed rest of the line as QR data and skips an empty QR", () => {
    expect(parseTicketMarkup("<<QR>>  https://dgii.gov.do/ecf?x=1&y=<<B>>  ").nodes).toEqual([
      { kind: "qr", data: "https://dgii.gov.do/ecf?x=1&y=<<B>>" },
    ]);
    expect(parseTicketMarkup("<<QR>>   ").nodes).toEqual([]);
  });

  it("clamps FEED to 1..10", () => {
    const { nodes } = parseTicketMarkup("<<FEED 0>>\n<<FEED 25>>\n<<FEED>>\n<<FEED -2>>");
    expect(nodes).toEqual([
      { kind: "feed", lines: 1 },
      { kind: "feed", lines: 10 },
      { kind: "feed", lines: 1 },
      { kind: "feed", lines: 1 },
    ]);
  });

  it("normalizes CRLF and CR line endings", () => {
    const { nodes } = parseTicketMarkup("<<B>>uno\r\ndos\rtres\n");
    expect(nodes.map((n) => (n.kind === "text" ? n.text : n.kind))).toEqual(["uno", "dos", "tres"]);
    expect(nodes[0]).toMatchObject({ style: { bold: true } });
    expect(nodes[1]).toMatchObject({ style: { bold: false } });
  });

  it("drops blank and whitespace-only lines, keeping inner spacing", () => {
    expect(parseTicketMarkup("a\n\n   \n<<C>>  \n  b  ").nodes).toEqual([
      { kind: "text", text: "a", style: PLAIN_STYLE },
      { kind: "text", text: "  b  ", style: PLAIN_STYLE },
    ]);
  });

  it("accepts null and empty input", () => {
    expect(parseTicketMarkup(null).nodes).toEqual([]);
    expect(parseTicketMarkup("").nodes).toEqual([]);
  });
});
