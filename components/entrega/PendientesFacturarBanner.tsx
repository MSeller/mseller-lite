import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Drivers load and deliver invoices only. Stops the office has not invoiced yet are not listed;
 * this banner says how many there are and who has to act.
 */
export function PendientesFacturarBanner({ count }: { count?: number }) {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  if (!count) return null;
  const tone = theme.custom.status.warning;
  return (
    <View
      style={[styles.banner, { backgroundColor: tone.container, borderRadius: theme.custom.radius.segment }]}
      accessibilityRole="alert"
      accessibilityLabel={t("entrega.pendientesFacturar", { count })}
    >
      <Icon source="file-alert-outline" size={20} color={tone.onContainer} />
      <Text variant="bodySmall" style={[styles.text, { color: tone.onContainer }]}>
        {t("entrega.pendientesFacturar", { count })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 12, padding: 12, minHeight: 44 },
  text: { flex: 1 },
});
