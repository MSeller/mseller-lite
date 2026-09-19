import React from "react";
import { StyleSheet, View } from "react-native";
import { ProgressBar, Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import AppCard from "../ui/AppCard";

interface ProgressHeaderProps {
  totalProductos: number;
  productosPreparados: number;
  noRuta: string;
  /** False once the route is past preparation: drops the "live" badge. Defaults to true. */
  live?: boolean;
}

const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  totalProductos,
  productosPreparados,
  noRuta,
  live = true,
}) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { status, spacing } = theme.custom;
  const progress = totalProductos > 0 ? productosPreparados / totalProductos : 0;
  const complete = totalProductos > 0 && productosPreparados >= totalProductos;
  const accent = complete ? status.positive.base : theme.colors.primary;

  return (
    <AppCard style={styles.card} contentStyle={{ padding: spacing.md }}>
      <View style={styles.topRow}>
        <Text
          variant="labelSmall"
          style={[styles.eyebrow, { color: theme.colors.onSurfaceVariant }]}
        >
          {t("preparacion.activeRoute")}
        </Text>
        {/* Live session: a dot and a word, not a filled chip competing with the route number. */}
        {live && (
          <View style={[styles.live, { backgroundColor: status.positive.container }]}>
            <View style={[styles.liveDot, { backgroundColor: status.positive.base }]} />
            <Text style={[styles.liveText, { color: status.positive.onContainer }]}>
              {t("preparacion.liveSession")}
            </Text>
          </View>
        )}
      </View>

      <Text
        variant="headlineSmall"
        style={[styles.routeNumber, { color: theme.colors.onSurface }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {noRuta}
      </Text>

      <View style={styles.progressRow}>
        <Text style={[styles.count, { color: theme.colors.onSurface }]}>
          {productosPreparados}
          <Text style={[styles.countTotal, { color: theme.colors.onSurfaceVariant }]}>
            {` / ${totalProductos}`}
          </Text>
        </Text>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={[styles.countLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          {t("preparacion.productsPicked")}
        </Text>
        <Text style={[styles.percent, { color: accent }]}>
          {`${Math.round(progress * 100)}%`}
        </Text>
      </View>

      <ProgressBar
        progress={progress}
        color={accent}
        style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}
      />
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 12,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    fontWeight: "700",
    letterSpacing: 1,
  },
  live: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  routeNumber: {
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 14,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 8,
  },
  count: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  countTotal: {
    fontSize: 15,
    fontWeight: "600",
  },
  countLabel: {
    flex: 1,
  },
  percent: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});

export default ProgressHeader;
