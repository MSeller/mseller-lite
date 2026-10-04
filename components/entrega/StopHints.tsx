import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon, useTheme } from "react-native-paper";

import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import type { VentanaEntrega } from "../../types/entrega";
import { estadoVentanas, formatVentanas } from "../../utils/deliveryWindow";

interface Props {
  /** The customer's address reference ("frente al colmado"), how the driver finds the door. */
  referencia?: string | null;
  ventanas?: VentanaEntrega[];
  /** The route's date; on that day the window line says whether it is open now. */
  fechaRuta?: string | null;
}

/** Spoken summary of the same hints, for the row's accessibility label. */
export const stopHintsA11y = (
  t: (key: string, options?: Record<string, unknown>) => string,
  { referencia, ventanas = [] }: Props
): string =>
  [
    referencia ? t("entrega.ui.referenceA11y", { value: referencia }) : "",
    ventanas.length ? t("entrega.ui.windowA11y", { value: formatVentanas(ventanas) }) : "",
  ]
    .filter(Boolean)
    .join(", ");

/**
 * The two things a driver needs before knocking, under a stop's address: where exactly the
 * door is (address reference) and when the customer receives (delivery window for the day).
 */
export function StopHints({ referencia, ventanas = [], fechaRuta }: Props) {
  const theme = useTheme() as CustomTheme;
  const { colors, status, type, spacing } = theme.custom;
  const { t } = useTranslation();
  if (!referencia && ventanas.length === 0) return null;

  const estado = estadoVentanas(ventanas, fechaRuta);
  const windowColor =
    estado === "open" ? status.positive.base : estado === "closed" ? status.warning.base : colors.inkSecondary;
  const estadoLabel =
    estado === "open"
      ? t("entrega.ui.windowOpen")
      : estado === "closed"
        ? t("entrega.ui.windowClosed")
        : "";

  return (
    <View style={{ gap: spacing.xs }}>
      {!!referencia && (
        <View style={styles.line}>
          <Icon source="sign-direction" size={16} color={colors.inkTertiary} />
          <Text style={[type.caption, styles.text, { color: colors.inkSecondary }]} numberOfLines={2}>
            {referencia}
          </Text>
        </View>
      )}
      {ventanas.length > 0 && (
        <View style={styles.line}>
          <Icon source="clock-outline" size={16} color={windowColor} />
          <Text style={[type.caption, styles.text, { color: windowColor, fontWeight: "600" }]} numberOfLines={2}>
            {formatVentanas(ventanas)}
            {estadoLabel ? ` · ${estadoLabel}` : ""}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  text: { flex: 1 },
});
