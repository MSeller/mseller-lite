import React from "react";
import { StyleSheet } from "react-native";

import { useTranslation } from "../../hooks/useTranslation";
import EmptyState from "../ui/EmptyState";

/**
 * What a 403 from the catalog endpoints looks like: the app's lock empty state with the
 * catalog's wording. The tab is hidden from everyone but administrators, so this is for
 * a role that changed mid-session or a deep link — not an error banner with a retry
 * that can never succeed.
 */
const CatalogLockedState: React.FC<{ message?: string | null }> = ({ message }) => {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="lock-outline"
      title={t("catalog.forbiddenTitle")}
      message={message || t("catalog.forbiddenBody")}
      style={styles.fill}
    />
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    padding: 32,
  },
});

export default CatalogLockedState;
