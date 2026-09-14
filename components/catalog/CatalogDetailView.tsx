import React, { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Banner, Divider, Icon, Snackbar, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import type { CatalogRequestError } from "../../utils/catalogValidation";
import AppCard from "../ui/AppCard";
import { useBottomTabOverflow } from "../ui/TabBarBackground";
import SectionHeader from "../ui/SectionHeader";
import CatalogLockedState from "./CatalogLockedState";
import { useHardwareBack } from "./useCatalogRecord";

export interface DetailRow {
  label: string;
  value: string | number | null | undefined;
}

interface Props {
  title: string;
  loading: boolean;
  failure: CatalogRequestError | null;
  /** True once the record is loaded; enables Editar and shows `children`. */
  ready: boolean;
  onBack: () => void;
  onEdit: () => void;
  onRetry: () => void;
  /** A one-line confirmation, e.g. after a save. */
  notice?: string;
  onNoticeDismiss?: () => void;
  children?: React.ReactNode;
}

/**
 * The read view of one catalog record: an app bar with back and Editar, the
 * loading / locked / failed states, and whatever sections the entity renders.
 */
const CatalogDetailView: React.FC<Props> = ({
  title,
  loading,
  failure,
  ready,
  onBack,
  onEdit,
  onRetry,
  notice,
  onNoticeDismiss,
  children,
}) => {
  const theme = useTheme() as CustomTheme;
  // iOS draws the tab bar over the screen; this is how much of the bottom it covers.
  const tabOverflow = useBottomTabOverflow();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  useHardwareBack(
    useCallback(() => {
      onBack();
      return true;
    }, [onBack])
  );

  const failureMessage =
    failure?.kind === "notFound"
      ? failure.message || t("catalog.notFound")
      : failure?.message || t("catalog.detailLoadFailed");

  const renderBody = () => {
    if (failure?.kind === "forbidden") return <CatalogLockedState message={failure.message} />;
    if (loading && !ready) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      );
    }
    if (!ready) {
      return (
        <View style={styles.center}>
          <Icon
            source={failure?.kind === "notFound" ? "file-remove-outline" : "cloud-alert-outline"}
            size={56}
            color={theme.colors.onSurfaceVariant}
          />
          <Text style={styles.emptyText}>{failureMessage}</Text>
        </View>
      );
    }
    return (
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + tabOverflow }]}>
        {children}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Appbar.Header mode="small" style={styles.appbar}>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title={title} />
        {ready && failure?.kind !== "forbidden" && (
          <Appbar.Action icon="pencil" accessibilityLabel={t("catalog.edit")} onPress={onEdit} />
        )}
      </Appbar.Header>

      {!!failure && failure.kind !== "forbidden" && failure.kind !== "notFound" && (
        <Banner
          visible
          icon="alert-circle-outline"
          actions={[{ label: t("catalog.retry"), onPress: onRetry }]}
        >
          {failureMessage}
        </Banner>
      )}

      {renderBody()}

      <Snackbar
        visible={!!notice}
        onDismiss={() => onNoticeDismiss?.()}
        duration={2500}
        wrapperStyle={{ bottom: tabOverflow }}
      >
        {notice ?? ""}
      </Snackbar>
    </SafeAreaView>
  );
};

/** One titled card of label/value rows. Empty values show a dash rather than vanishing. */
export const DetailSection: React.FC<{ title: string; rows: DetailRow[] }> = ({ title, rows }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <AppCard>
        <View style={styles.rows}>
          {rows.map((row, index) => {
            const empty = row.value === null || row.value === undefined || row.value === "";
            return (
              <View key={row.label}>
                {index > 0 && <Divider style={styles.divider} />}
                <View style={styles.row}>
                  <Text variant="bodyMedium" style={styles.label}>
                    {row.label}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[styles.value, empty && styles.emptyValue]}
                    selectable
                  >
                    {empty ? t("catalog.noValue") : String(row.value)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </AppCard>
    </View>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    appbar: {
      backgroundColor: theme.colors.background,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      gap: 12,
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
    content: {
      padding: 16,
      gap: 8,
    },
    section: {
      marginBottom: 12,
    },
    rows: {
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16,
      paddingVertical: 10,
    },
    divider: {
      backgroundColor: theme.colors.outlineVariant,
    },
    label: {
      color: theme.colors.onSurfaceVariant,
      flexShrink: 0,
      maxWidth: "45%",
    },
    value: {
      color: theme.colors.onSurface,
      fontWeight: "600",
      flex: 1,
      textAlign: "right",
    },
    emptyValue: {
      color: theme.colors.onSurfaceVariant,
      fontWeight: "400",
    },
  });

export default CatalogDetailView;
