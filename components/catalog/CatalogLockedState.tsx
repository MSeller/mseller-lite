import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

import { useTranslation } from "../../hooks/useTranslation";

interface Props {
  /** The server's own explanation, when it sent one. */
  message?: string | null;
}

/**
 * What a 403 from the catalog endpoints looks like. The tab is hidden from everyone
 * but administrators, so this is for a role that changed mid-session or a deep link —
 * a lock and a sentence, not an error banner with a retry that can never succeed.
 */
const CatalogLockedState: React.FC<Props> = ({ message }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Icon source="lock-outline" size={56} color={theme.colors.onSurfaceVariant} />
      <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
        {t("catalog.forbiddenTitle")}
      </Text>
      <Text variant="bodyMedium" style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
        {message || t("catalog.forbiddenBody")}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  title: {
    fontWeight: "600",
    textAlign: "center",
  },
  body: {
    textAlign: "center",
  },
});

export default CatalogLockedState;
