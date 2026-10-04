import React, { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "@/constants/Theme";
import BrandGradient from "../ui/BrandGradient";

interface Props {
  overline: string;
  /** The route number, under the overline. */
  title?: string;
  done: number;
  total: number;
  /** What `done` counts ("productos preparados", "clientes cargados"). */
  caption: string;
  /** Shows the live-session dot next to the overline. */
  live?: boolean;
  /** One line of context under a divider (the truck on the load screen). */
  meta?: { icon: string; label: string };
  style?: StyleProp<ViewStyle>;
}

/**
 * The brand summary card of the preparation flow: how far along the route is, as the big
 * figure the picker or loader checks between items. Shared by picking and truck loading so both
 * read the same way.
 */
const ProgressSummaryCard: React.FC<Props> = ({
  overline,
  title,
  done,
  total,
  caption,
  live = false,
  meta,
  style,
}) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme.custom;
  const progress = total > 0 ? Math.min(1, done / total) : 0;
  const complete = total > 0 && done >= total;
  const percent = `${Math.round(progress * 100)}%`;

  return (
    <BrandGradient raised style={style}>
      <View
        style={styles.body}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={[overline, title, `${done} / ${total} ${caption}`, percent]
          .filter(Boolean)
          .join(", ")}
      >
        <View style={styles.topRow}>
          <Text style={styles.overline} numberOfLines={1}>
            {overline}
          </Text>
          {live && <View style={styles.liveDot} />}
        </View>
        {!!title && (
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {title}
          </Text>
        )}

        <View style={styles.figureRow}>
          <Text style={styles.figure} numberOfLines={1} adjustsFontSizeToFit>
            {done}
            <Text style={styles.figureTotal}>{` / ${total}`}</Text>
          </Text>
          <View style={styles.percentGroup}>
            {complete && <Icon source="check-circle" size={18} color={colors.onGradient} />}
            <Text style={styles.percent}>{percent}</Text>
          </View>
        </View>
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {!!meta && (
        <View style={styles.meta}>
          <Icon source={meta.icon} size={18} color={colors.onGradientSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {meta.label}
          </Text>
        </View>
      )}
    </BrandGradient>
  );
};

const TRACK_HEIGHT = 4;
const DOT_SIZE = 8;

const createStyles = (theme: CustomTheme) => {
  const { colors, spacing, type, hairline } = theme.custom;
  return StyleSheet.create({
    body: {
      padding: spacing.xl,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    overline: {
      ...type.overline,
      color: colors.onGradientSecondary,
      flexShrink: 1,
    },
    // The session is live while this screen is open; success green reads on the blue gradient.
    liveDot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      backgroundColor: colors.successSwitch,
    },
    title: {
      ...type.rowTitle,
      color: colors.onGradient,
      marginTop: spacing.xs,
    },
    figureRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: spacing.md,
      marginTop: spacing.md,
    },
    figure: {
      ...type.figure(34),
      color: colors.onGradient,
      flexShrink: 1,
    },
    figureTotal: {
      ...type.figure(20),
      color: colors.onGradientSecondary,
    },
    percentGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingBottom: spacing.xs,
    },
    percent: {
      ...type.figure(17),
      color: colors.onGradient,
    },
    caption: {
      ...type.bodySmall,
      color: colors.onGradientSecondary,
    },
    track: {
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: colors.onGradientDivider,
      marginTop: spacing.md,
      overflow: "hidden",
    },
    fill: {
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: colors.onGradient,
    },
    meta: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderTopWidth: hairline,
      borderTopColor: colors.onGradientDivider,
    },
    metaText: {
      ...type.bodySmall,
      color: colors.onGradientSecondary,
      flexShrink: 1,
    },
  });
};

export default ProgressSummaryCard;
