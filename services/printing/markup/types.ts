/**
 * The ticket as a printer-agnostic tree.
 *
 * The server renders a ticket as plain text with `<<MARKER>>` line prefixes (see
 * `parse.ts`). Parsing it once into this shape is what lets one ticket feed several
 * outputs — the on-screen preview and every printer driver — without each of them
 * re-reading the marker syntax.
 */

export type TicketAlign = "left" | "center" | "right";

export interface TicketTextStyle {
  align: TicketAlign;
  bold: boolean;
  doubleHeight: boolean;
  doubleWidth: boolean;
}

export type TicketNode =
  | { kind: "text"; text: string; style: TicketTextStyle }
  /** Full-width separator line. */
  | { kind: "hr" }
  /** A QR symbol, always centered. `data` is never empty. */
  | { kind: "qr"; data: string }
  /** `lines` blank lines, 1..10. */
  | { kind: "feed"; lines: number }
  /** Paper cut — drivers skip it when the printer has no cutter. */
  | { kind: "cut" };

export interface Ticket {
  nodes: TicketNode[];
}

export const PLAIN_STYLE: TicketTextStyle = {
  align: "left",
  bold: false,
  doubleHeight: false,
  doubleWidth: false,
};
