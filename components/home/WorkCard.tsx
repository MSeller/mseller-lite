import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Icon, Text, TouchableRipple, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import AppCard from "../ui/AppCard";

export interface WorkCardLine {
  value: number;
  label: string;
  /** Draws the number in the warning tone — something is waiting on this user. */
  attention?: boolean;
}

interface WorkCardProps {
  title: string;
  icon: string;
  loading: boolean;
  failed: boolean;
  lines: WorkCardLine[] | null;
  onPress: () => void;
  onRetry: () => void;
}

/**
 * One module's "today" numbers on the home screen. Tapping opens the module.
 * The first line is the headline figure; the rest are supporting counts.
 */
export default function WorkCard({ title, icon, loading, failed, lines, onPress, onRetry }: WorkCardProps) {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const [headline, ...rest] = lines ?? [];

  return (
    <AppCard style={styles.card} onPress={onPress} contentStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={styles.iconWrap}>
          <Icon source={icon} size={18} color={theme.colors.primary} />
        </View>
        <Text variant="labelLarge" style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {loading && !lines ? (
        <ActivityIndicator style={styles.loading} />
      ) : failed && !lines ? (
        <TouchableRipple onPress={onRetry} borderless style={styles.retry}>
          <View style={styles.retryInner}>
            <Text variant="headlineSmall" style={styles.muted}>
              —
            </Text>
            <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
              {t("common.retry")}
            </Text>
          </View>
        </TouchableRipple>
      ) : headline ? (
        <>
          <Text
            variant="headlineMedium"
            style={[
              styles.value,
              headline.attention && headline.value > 0 && { color: theme.custom.status.warning.base },
            ]}
          >
            {headline.value}
          </Text>
          <Text variant="bodySmall" style={styles.muted} numberOfLines={1}>
            {headline.label}
          </Text>
          {rest.map((line) => (
            <Text
              key={line.label}
              variant="bodySmall"
              numberOfLines={1}
              style={[
                styles.secondary,
                line.attention && line.value > 0 && { color: theme.custom.status.warning.base },
              ]}
            >
              {line.value} {line.label}
            </Text>
          ))}
        </>
      ) : null}
    </AppCard>
  );
}

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    card: {
      flexBasis: "47%",
      flexGrow: 1,
    },
    content: {
      padding: theme.custom.spacing.md,
      minHeight: 132,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
    },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.colors.primary}14`,
    },
    title: {
      flex: 1,
      color: theme.colors.onSurface,
    },
    value: {
      color: theme.colors.onSurface,
    },
    muted: {
      color: theme.colors.onSurfaceVariant,
    },
    secondary: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    loading: {
      marginTop: 16,
      alignSelf: "flex-start",
    },
    retry: {
      alignSelf: "flex-start",
      borderRadius: 8,
    },
    retryInner: {
      paddingVertical: 2,
    },
  });
