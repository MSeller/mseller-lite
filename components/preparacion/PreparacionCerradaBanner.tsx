import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import type { RutaPreparacionStatus } from "../../types/preparacion";
import { preparacionCompletada } from "../../utils/routeLoading";
import AppCard from "../ui/AppCard";
import StatusChip from "../ui/StatusChip";

interface Props {
  /** Route status; undefined when only a 409 PREPARACION_CERRADA told us it is closed. */
  status?: RutaPreparacionStatus;
}

/**
 * Shown on Preparación › Picking / Inventario when the route is no longer open for picking
 * (MSE-257): the list below is a read-only record of what was prepared.
 */
const PreparacionCerradaBanner: React.FC<Props> = ({ status }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { status: tones, spacing, radius } = theme.custom;
  // A cancelled or draft route was never prepared: say it is unavailable, not "completed".
  const completada = status == null || preparacionCompletada(status);
  const tone = completada ? tones.positive : tones.neutral;

  return (
    <AppCard style={styles.card} contentStyle={{ padding: spacing.md }}>
      <View style={styles.row}>
        <View style={[styles.tile, { borderRadius: radius.sm, backgroundColor: tone.container }]}>
          <Icon source={completada ? "clipboard-check-outline" : "lock-outline"} size={22} color={tone.base} />
        </View>
        <View style={styles.info}>
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            {completada ? t("preparacion.preparationClosedTitle") : t("preparacion.preparationUnavailableTitle")}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {t("preparacion.preparationClosedHint")}
          </Text>
        </View>
      </View>
      {!!status && (
        <View style={[styles.footer, { marginTop: spacing.sm }]}>
          <StatusChip tone={completada ? "positive" : "neutral"} label={t(`entrega.status.${status}`)} />
        </View>
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tile: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});

export default PreparacionCerradaBanner;
