import React, { useMemo } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Banner, Icon, Text, useTheme } from "react-native-paper";

import { gutterFor, type CustomTheme } from "../../constants/Theme";
import EmptyState from "../ui/EmptyState";
import type { RouteListFailure } from "../../utils/routeStatus";
import { useTranslation } from "../../hooks/useTranslation";
import type { RutaPreparacionStatus } from "../../types/preparacion";
import RouteStatusChip from "./RouteStatusChip";

/**
 * The pieces the Rutas lists (Preparación, Carga, Entregas) are built from, so the three read
 * as one screen: large title, full-bleed rows on the page with hairline separators, the status
 * chip on the right and a thin progress bar under each route.
 */

const PROGRESS_HEIGHT = 4;
const SKELETON_ROWS = [0, 1, 2];

const useRouteListStyles = () => {
  const theme = useTheme() as CustomTheme;
  const { width } = useWindowDimensions();
  const gutter = gutterFor(width);
  return useMemo(() => createStyles(theme, gutter), [theme, gutter]);
};

export const RouteListHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const styles = useRouteListStyles();
  return (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
  );
};

/** "12 RUTAS" above the rows; the overline style uppercases it. */
export const RouteListOverline: React.FC<{ label: string }> = ({ label }) => {
  const styles = useRouteListStyles();
  return <Text style={styles.overline}>{label}</Text>;
};

interface RouteRowProps {
  title: string;
  /** Sits next to the route number — the driver's "Activa" chip. */
  titleAccessory?: React.ReactNode;
  status: RutaPreparacionStatus;
  /** First line in secondary ink (who), the rest tertiary (counts). */
  lines: string[];
  /** 0…1; complete reads green, anything less reads as the tint. */
  progress: number;
  /** The "n/m" figure, in tabular digits so the column does not jitter between rows. */
  progressFigure: string;
  progressLabel: string;
  accessibilityLabel: string;
  onPress: () => void;
}

export const RouteRow: React.FC<RouteRowProps> = ({
  title,
  titleAccessory,
  status,
  lines,
  progress,
  progressFigure,
  progressLabel,
  accessibilityLabel,
  onPress,
}) => {
  const theme = useTheme() as CustomTheme;
  const styles = useRouteListStyles();
  const complete = progress >= 1;
  const fill = complete ? theme.custom.status.positive.base : theme.custom.colors.tint;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <View style={styles.rowTitleGroup}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {title}
            </Text>
            {titleAccessory}
          </View>
          <RouteStatusChip status={status} />
        </View>

        {lines.map((line, index) => (
          <Text key={index} style={index === 0 ? styles.lineSecondary : styles.lineTertiary}>
            {line}
          </Text>
        ))}

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(Math.max(progress, 0), 1) * 100}%`, backgroundColor: fill },
            ]}
          />
        </View>
        <Text style={styles.progressCaption}>
          <Text style={styles.progressFigure}>{progressFigure}</Text> {progressLabel}
        </Text>
      </View>

      <Icon source="chevron-right" size={22} color={theme.custom.colors.tint} />
    </Pressable>
  );
};

export const RouteRowSeparator: React.FC = () => {
  const styles = useRouteListStyles();
  return <View style={styles.separator} />;
};

/** Placeholder rows shaped like the real ones, so the list does not jump when data lands. */
export const RouteListSkeleton: React.FC = () => {
  const styles = useRouteListStyles();
  return (
    <View accessibilityRole="progressbar">
      {SKELETON_ROWS.map((i) => (
        <View key={i}>
          {i > 0 && <RouteRowSeparator />}
          <View style={styles.skeletonRow}>
            <View style={[styles.skeletonBlock, styles.skeletonTitle]} />
            <View style={[styles.skeletonBlock, styles.skeletonLine]} />
            <View style={[styles.skeletonBlock, styles.skeletonBar]} />
          </View>
        </View>
      ))}
    </View>
  );
};

export const RouteListEmpty: React.FC<{ icon: string; title: string; message: string }> = ({
  icon,
  title,
  message,
}) => {
  const styles = useRouteListStyles();
  return <EmptyState icon={icon} title={title} message={message} style={styles.empty} />;
};

interface RouteListFailureStateProps {
  failure: RouteListFailure;
  /** Wording for the module, e.g. "Entregas no habilitadas". */
  disabledTitle: string;
  disabledBody: string;
  failedTitle: string;
  onRetry: () => void;
}

/** A list that could not load and has no rows to show: the reason fills the screen. */
export const RouteListFailureState: React.FC<RouteListFailureStateProps> = ({
  failure,
  disabledTitle,
  disabledBody,
  failedTitle,
  onRetry,
}) => {
  const { t } = useTranslation();
  const styles = useRouteListStyles();
  if (failure.kind === "disabled") {
    return (
      <EmptyState
        icon="lock-outline"
        title={disabledTitle}
        message={disabledBody}
        action={{ label: t("common.refresh"), onPress: onRetry }}
        style={styles.empty}
      />
    );
  }
  if (failure.kind === "unassigned") {
    return (
      <EmptyState
        icon="account-alert-outline"
        title={t("entrega.list.unassignedTitle")}
        message={t("entrega.list.unassignedBody")}
        action={{ label: t("common.refresh"), onPress: onRetry }}
        style={styles.empty}
      />
    );
  }
  return (
    <EmptyState
      icon="cloud-alert-outline"
      title={failedTitle}
      message={failure.message}
      action={{ label: t("common.retry"), onPress: onRetry }}
      style={styles.empty}
    />
  );
};

/** A failed refresh keeps the rows already shown, with its retry, until the next load succeeds. */
export const RouteListError: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => {
  const { t } = useTranslation();
  return (
    <Banner visible icon="alert-circle-outline" actions={[{ label: t("common.retry"), onPress: onRetry }]}>
      {message}
    </Banner>
  );
};

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, spacing, type, radius, hairline, touchTarget } = theme.custom;
  return StyleSheet.create({
    header: {
      paddingHorizontal: gutter,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      gap: spacing.xs,
    },
    title: {
      ...type.largeTitle,
    },
    subtitle: {
      ...type.bodySmall,
    },
    overline: {
      ...type.overline,
      paddingHorizontal: gutter,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: touchTarget,
      paddingVertical: spacing.md,
      paddingHorizontal: gutter,
      backgroundColor: colors.background,
    },
    rowPressed: {
      backgroundColor: colors.fill,
    },
    rowBody: {
      flex: 1,
      gap: spacing.xs,
    },
    rowTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    rowTitleGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flexShrink: 1,
    },
    rowTitle: {
      ...type.rowTitle,
      flexShrink: 1,
    },
    lineSecondary: {
      ...type.caption,
      color: colors.inkSecondary,
    },
    lineTertiary: {
      ...type.caption,
    },
    progressTrack: {
      height: PROGRESS_HEIGHT,
      borderRadius: PROGRESS_HEIGHT / 2,
      backgroundColor: colors.fill,
      overflow: "hidden",
      marginTop: spacing.xs,
    },
    progressFill: {
      height: PROGRESS_HEIGHT,
      borderRadius: PROGRESS_HEIGHT / 2,
    },
    progressCaption: {
      ...type.caption,
    },
    progressFigure: {
      ...type.figure(type.caption.fontSize ?? spacing.md),
      color: colors.inkSecondary,
    },
    separator: {
      height: hairline,
      backgroundColor: colors.hairline,
      marginLeft: gutter,
    },
    skeletonRow: {
      paddingHorizontal: gutter,
      paddingVertical: spacing.lg,
      gap: spacing.sm,
    },
    skeletonBlock: {
      backgroundColor: colors.fill,
      borderRadius: radius.tag,
    },
    skeletonTitle: {
      width: "40%",
      height: spacing.lg,
    },
    skeletonLine: {
      width: "65%",
      height: spacing.md,
    },
    skeletonBar: {
      width: "100%",
      height: PROGRESS_HEIGHT,
      marginTop: spacing.xs,
    },
    empty: {
      alignItems: "center",
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.xxl * 2,
      gap: spacing.md,
    },
  });
};
