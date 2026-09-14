import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import type { CustomTheme, StatusTokens } from "../../constants/Theme";

interface Props {
  label: string;
  tone?: keyof StatusTokens;
}

/**
 * A small tinted label for a catalog row or header — "Inactivo", "Servicio".
 * Reads its colours from `custom.status`, so a warning looks like a warning and
 * never borrows a button colour.
 */
const CatalogBadge: React.FC<Props> = ({ label, tone = "neutral" }) => {
  const theme = useTheme() as CustomTheme;
  const colors = theme.custom.status[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors.container }]}>
      <Text variant="labelSmall" style={[styles.text, { color: colors.onContainer }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  text: {
    fontWeight: "700",
  },
});

export default CatalogBadge;
