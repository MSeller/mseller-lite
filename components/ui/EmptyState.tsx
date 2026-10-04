import React, { useMemo } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";

export interface EmptyStateAction {
  label: string;
  /** Defaults to `refresh`, the usual next step after a failed load. */
  icon?: string;
  onPress: () => void;
}

interface Props {
  icon: string;
  /** Optional heading above the message. */
  title?: string;
  message: string;
  /** The next step, as a plain tint quick action: retry, clear the search, create the record. */
  action?: EmptyStateAction;
  /** Layout from the container: flex, padding, alignment within the screen. */
  style?: StyleProp<ViewStyle>;
}

const WELL_SIZE = 56;

/**
 * The guide's placeholder for a screen or list with nothing to show — nothing offered for
 * this user type, a locked module, no search results, a failed load: icon in a soft circle,
 * title, one sentence and, when there is one, the next action.
 */
const EmptyState: React.FC<Props> = ({ icon, title, message, action, style }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme.custom;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.well}>
        <Icon source={icon} size={28} color={colors.tint} />
      </View>
      {!!title && (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      )}
      <Text style={styles.message}>{message}</Text>
      {!!action && (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Icon source={action.icon ?? "refresh"} size={20} color={colors.tint} />
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
};

const createStyles = (theme: CustomTheme) => {
  const { colors, spacing, type, touchTarget } = theme.custom;
  return StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      padding: spacing.xxl,
    },
    // A circle: the radius is half the well's own size (geometry, not a token).
    well: {
      width: WELL_SIZE,
      height: WELL_SIZE,
      borderRadius: WELL_SIZE / 2,
      backgroundColor: colors.tintSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.xs,
    },
    title: {
      ...type.rowTitle,
      textAlign: "center",
    },
    message: {
      ...type.bodySmall,
      textAlign: "center",
    },
    action: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: touchTarget,
      paddingHorizontal: spacing.md,
    },
    pressed: {
      opacity: 0.6,
    },
    actionLabel: {
      ...type.body,
      fontWeight: "600",
      color: colors.tint,
    },
  });
};

export default EmptyState;
