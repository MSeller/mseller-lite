import React, { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import type { Ticket, TicketNode } from "../../services/printing/markup/types";
import { buildQrMatrix } from "../../services/printing/qr";

interface Props {
  ticket: Ticket;
  /** Characters per line at normal size: 32 on 58mm paper, 48 on 80mm. */
  columns: number;
  /** Whether the printer cuts; a cut marker on a printer without a cutter shows nothing. */
  hasCutter?: boolean;
}

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });
/** Advance width of a monospace glyph relative to its font size (Menlo/Roboto Mono ≈ 0.6). */
const GLYPH_RATIO = 0.6;
const PAPER = "#fdfdf8";
const INK = "#1a1a1a";

/**
 * The ticket as it will come out of the printer: monospace at the printer's column count,
 * with alignment, bold, double size, separators and the QR drawn to scale.
 *
 * Colors are fixed paper-and-ink rather than themed — this is a picture of a receipt, and a
 * dark-mode receipt would misrepresent what the customer gets.
 */
const TicketPreview: React.FC<Props> = ({ ticket, columns, hasCutter = true }) => {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.floor(e.nativeEvent.layout.width);
    if (next !== width) setWidth(next);
  };

  const fontSize = width > 0 ? width / columns / GLYPH_RATIO : 10;
  const lineHeight = Math.ceil(fontSize * 1.35);

  return (
    <View style={styles.paper}>
      <View onLayout={onLayout} style={styles.content}>
        {width > 0 &&
          ticket.nodes.map((node, index) => (
            <PreviewNode
              key={index}
              node={node}
              columns={columns}
              width={width}
              fontSize={fontSize}
              lineHeight={lineHeight}
              hasCutter={hasCutter}
            />
          ))}
      </View>
    </View>
  );
};

const PreviewNode: React.FC<{
  node: TicketNode;
  columns: number;
  width: number;
  fontSize: number;
  lineHeight: number;
  hasCutter: boolean;
}> = ({ node, columns, width, fontSize, lineHeight, hasCutter }) => {
  const base = { fontFamily: MONO, fontSize, lineHeight, color: INK };

  switch (node.kind) {
    case "hr":
      return (
        <Text style={base} numberOfLines={1}>
          {"-".repeat(columns)}
        </Text>
      );
    case "feed":
      return <View style={{ height: lineHeight * node.lines }} />;
    case "cut":
      return hasCutter ? <View style={styles.cut} /> : null;
    case "qr":
      return <PreviewQr data={node.data} maxWidth={width} fontSize={fontSize} />;
    case "text": {
      const { style } = node;
      const textAlign = style.align;
      const fontWeight = style.bold ? ("700" as const) : ("400" as const);

      if (style.doubleWidth) {
        // Double width doubles the glyph; ESC/POS doubles height with it only when 2H is
        // also set, but at preview scale a proportionally larger glyph reads closest.
        const size = fontSize * 2;
        return (
          <Text style={[base, { fontSize: size, lineHeight: lineHeight * 2, textAlign, fontWeight }]}>
            {node.text}
          </Text>
        );
      }
      if (style.doubleHeight) {
        return (
          <View style={{ height: lineHeight * 2, justifyContent: "center" }}>
            <Text style={[base, { textAlign, fontWeight, transform: [{ scaleY: 2 }] }]}>{node.text}</Text>
          </View>
        );
      }
      return <Text style={[base, { textAlign, fontWeight }]}>{node.text}</Text>;
    }
  }
};

const PreviewQr: React.FC<{ data: string; maxWidth: number; fontSize: number }> = ({ data, maxWidth, fontSize }) => {
  const matrix = useMemo(() => buildQrMatrix(data), [data]);

  // One View per run of dark modules in a row, not per module: a fiscal URL is a 50+ module
  // symbol, and thousands of Views would stall the sheet.
  const rows = useMemo(() => {
    if (!matrix) return [];
    const out: { start: number; length: number }[][] = [];
    for (let r = 0; r < matrix.size; r++) {
      const runs: { start: number; length: number }[] = [];
      let c = 0;
      while (c < matrix.size) {
        if (!matrix.isDark(r, c)) {
          c++;
          continue;
        }
        const start = c;
        while (c < matrix.size && matrix.isDark(r, c)) c++;
        runs.push({ start, length: c - start });
      }
      out.push(runs);
    }
    return out;
  }, [matrix]);

  if (!matrix) {
    return (
      <Text style={{ fontFamily: MONO, fontSize, color: INK, textAlign: "center" }}>[QR]</Text>
    );
  }

  const module = Math.max(1, Math.floor(Math.min(maxWidth * 0.6, 220) / matrix.size));
  const side = module * matrix.size;

  return (
    <View style={styles.qrWrap}>
      <View style={{ width: side, height: side, backgroundColor: PAPER }}>
        {rows.map((runs, r) =>
          runs.map((run) => (
            <View
              key={`${r}-${run.start}`}
              style={{
                position: "absolute",
                top: r * module,
                left: run.start * module,
                width: run.length * module,
                height: module,
                backgroundColor: INK,
              }}
            />
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  paper: {
    backgroundColor: PAPER,
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d8d8cc",
  },
  content: { width: "100%" },
  cut: {
    marginVertical: 8,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#9a9a90",
  },
  qrWrap: { alignItems: "center", paddingVertical: 8 },
});

export default TicketPreview;
