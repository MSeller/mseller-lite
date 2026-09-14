import { PLAIN_STYLE, type Ticket, type TicketNode, type TicketTextStyle } from "./types";

/**
 * Parses the marker text `GET consumo/Documento/{no}/ticket` returns into a {@link Ticket}.
 *
 * The format is shared with mseller-core-api (the Scriban `mobile-ticket` template writes it)
 * and follows the same rules as its `EscPosReceiptBuilder`:
 *
 * - Lines split on `\n`; `\r\n` and `\r` are normalized first so a template saved on Windows
 *   does not double-space.
 * - A line may start with several stacked `<<TOKEN>>` groups. Formatting applies to that line
 *   only and resets at its end.
 * - `<<HR>>`, `<<QR>>`, `<<FEED n>>` and `<<CUT>>` are block markers: once one is read the
 *   line is that block (for QR, the rest of the line is the data) and earlier style markers
 *   are ignored.
 * - Unknown tokens are dropped rather than printed — a template newer than the app must not
 *   leak `<<SOMETHING>>` onto a customer's receipt.
 * - Blank lines are dropped, as on the server's receipt builder: Scriban control flow leaves
 *   empty lines behind, and on thermal paper they are wasted paper. `<<FEED n>>` is the way
 *   to ask for vertical space.
 */
export function parseTicketMarkup(text: string | null | undefined): Ticket {
  const normalized = (text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const nodes: TicketNode[] = [];

  for (const line of normalized.split("\n")) {
    const node = parseLine(line);
    if (node) nodes.push(node);
  }

  return { nodes };
}

const MAX_FEED = 10;

function parseLine(line: string): TicketNode | null {
  const style: TicketTextStyle = { ...PLAIN_STYLE };
  let rest = line;

  while (rest.startsWith("<<")) {
    const close = rest.indexOf(">>", 2);
    // An unterminated "<<" is content, not a marker.
    if (close < 0) break;

    const token = rest.slice(2, close).trim().toUpperCase();
    rest = rest.slice(close + 2);

    switch (token) {
      case "C":
        style.align = "center";
        break;
      case "R":
        style.align = "right";
        break;
      case "B":
        style.bold = true;
        break;
      case "CB":
        style.align = "center";
        style.bold = true;
        break;
      case "2H":
        style.doubleHeight = true;
        break;
      case "2W":
        style.doubleWidth = true;
        break;
      case "HR":
        return { kind: "hr" };
      case "CUT":
        return { kind: "cut" };
      case "QR": {
        const data = rest.trim();
        return data ? { kind: "qr", data } : null;
      }
      default: {
        const feed = /^FEED(?:\s+(-?\d+))?$/.exec(token);
        if (feed) {
          const n = feed[1] === undefined ? 1 : parseInt(feed[1], 10);
          return { kind: "feed", lines: Math.min(MAX_FEED, Math.max(1, n)) };
        }
        // Unknown token: stripped.
      }
    }
  }

  if (rest.trim() === "") return null;
  return { kind: "text", text: rest, style };
}
