import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

import { gutterFor, type CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Drivers load and deliver invoices only. Stops the office has not invoiced yet are not listed;
 * this banner says how many there are and who has to act. A full-bleed strip, like the rows
 * around it, rather than a boxed card.
 */
export function PendientesFacturarBanner({ count }: { count?: number }) {
  const theme = useTheme() as CustomTheme;
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  if (!count) return null;
  const { colors, spacing, type, touchTarget } = theme.custom;
  const message = t("entrega.pendientesFacturar", { count });
  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.warningBackground,
          paddingHorizontal: gutterFor(width),
          paddingVertical: spacing.md,
          gap: spacing.md,
          minHeight: touchTarget,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <Icon source="file-alert-outline" size={22} color={colors.warningForeground} />
      <Text style={[type.bodySmall, styles.text, { color: colors.warningForeground }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center" },
  text: { flex: 1 },
});
