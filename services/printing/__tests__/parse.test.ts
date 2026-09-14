import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

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
    const { nodes } = parseTicketMarkup("<<FEED 0>>\n<<FEED 25>>\n<<FEED>>\n<<feed 3>>");
    expect(nodes).toEqual([
      { kind: "feed", lines: 1 },
      { kind: "feed", lines: 10 },
      { kind: "feed", lines: 1 },
      { kind: "feed", lines: 3 },
    ]);
  });

  it("only treats token-shaped groups as markers, like the server", () => {
    // Not a token: printed as text, and it ends marker parsing for the line.
    expect(parseTicketMarkup("<<B>><<Oferta: 2x1>> hoy").nodes).toEqual([
      { kind: "text", text: "<<Oferta: 2x1>> hoy", style: { ...PLAIN_STYLE, bold: true } },
    ]);
    expect(parseTicketMarkup("<<FEED -2>>").nodes[0]).toMatchObject({ kind: "text", text: "<<FEED -2>>" });
    expect(parseTicketMarkup("<< B >>x").nodes[0]).toMatchObject({ kind: "text", text: "<< B >>x" });
    expect(parseTicketMarkup("<<ABCDEFGHIJKLM>>x").nodes[0]).toMatchObject({ kind: "text" });
    // Token-shaped but unknown: stripped. Case-insensitive.
    expect(parseTicketMarkup("<<ABCDEFGHIJKL>><<c>>x").nodes).toEqual([
      { kind: "text", text: "x", style: { ...PLAIN_STYLE, align: "center" } },
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

describe("core-api TicketMovil fixtures", () => {
  for (const ancho of [32, 48] as const) {
    it(`parses invoice-ecf-${ancho} with nothing literal left and every line fitting`, () => {
      const texto = readFileSync(join(__dirname, "fixtures", `invoice-ecf-${ancho}.txt`), "utf8");
      const { nodes } = parseTicketMarkup(texto);

      expect(nodes.filter((n) => n.kind === "qr")).toHaveLength(1);
      expect(nodes.filter((n) => n.kind === "hr").length).toBeGreaterThan(0);
      for (const node of nodes) {
        if (node.kind !== "text") continue;
        expect(node.text).not.toContain("<<");
        const limit = node.style.doubleWidth ? ancho / 2 : ancho;
        expect(node.text.length).toBeLessThanOrEqual(limit);
      }
    });
  }
});
