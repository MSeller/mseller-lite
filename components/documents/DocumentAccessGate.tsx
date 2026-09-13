import React from "react";
import { StyleSheet } from "react-native";
import { ActivityIndicator, Icon, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useDocumentAccess } from "../../hooks/useDocumentAccess";
import { useTranslation } from "../../hooks/useTranslation";

/**
 * Renders its children only for users who may capture documents.
 *
 * The tab itself is hidden for a driver, so this is the second line: a deep link
 * or a stale navigation state must not land them on a form the API will refuse.
 * It explains rather than 404s — "not for your role" is a different answer from
 * "broken", and the person deserves to know which.
 */
const DocumentAccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { canCreateDocuments, loading } = useDocumentAccess();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!canCreateDocuments) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Icon source="lock-outline" size={56} color={theme.colors.onSurfaceVariant} />
        <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
          {t("documents.accessDeniedTitle")}
        </Text>
        <Text variant="bodyMedium" style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
          {t("documents.accessDeniedBody")}
        </Text>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
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

export default DocumentAccessGate;
