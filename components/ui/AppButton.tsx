import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { ActivityIndicator, Icon, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import BrandGradient from "./BrandGradient";

/** Paper's `Button` modes, so screens switch over without rewriting each call. */
export type AppButtonMode = "contained" | "contained-tonal" | "outlined" | "text" | "elevated";

interface Props {
  /**
   * `contained` is the screen's primary action, drawn with the brand gradient. `outlined` and
   * `contained-tonal` are secondary actions on a quiet `fill` well. `text` (the default, as in
   * Paper) is a plain tint quick action.
   */
  mode?: AppButtonMode;
  children: React.ReactNode;
  onPress?: () => void;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  /** Tighter horizontal padding, for buttons in a row or a dialog. */
  compact?: boolean;
  /**
   * Label colour. Pass the theme's error/destructive colour for a destructive action; any
   * other value is honoured as given.
   */
  textColor?: string;
  /** Kept for Paper compatibility: the error colour turns a contained button destructive. */
  buttonColor?: string;
  style?: StyleProp<ViewStyle>;
  /** Applied to the button's inner row — screens use it for height. */
  contentStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * The app's button, following the MSeller design guide (iOS `mobile-seller` is the source of
 * truth): the brand gradient only on the primary call to action, secondary actions on a quiet
 * `fill` well, quick actions as plain tint text with an icon. Corners are `radius.control`;
 * there are no outlined boxes and no pill buttons. A disabled primary becomes a grey well
 * rather than a faded gradient, so it never looks like an invitation.
 */
const AppButton: React.FC<Props> = ({
  mode = "text",
  children,
  onPress,
  icon,
  disabled = false,
  loading = false,
  compact = false,
  textColor,
  buttonColor,
  style,
  contentStyle,
  labelStyle,
  accessibilityLabel,
  testID,
}) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors, status } = theme.custom;

  const destructiveColors = [theme.colors.error, colors.destructive];
  const destructive =
    (!!textColor && destructiveColors.includes(textColor)) ||
    (!!buttonColor && destructiveColors.includes(buttonColor));
  const variant: "primary" | "secondary" | "plain" =
    mode === "contained" || mode === "elevated"
      ? destructive
        ? "secondary"
        : "primary"
      : mode === "text"
        ? "plain"
        : "secondary";
  const inactive = disabled || loading;

  const foreground = disabled
    ? colors.inkTertiary
    : destructive
      ? colors.destructive
      : variant === "primary"
        ? colors.onGradient
        : (textColor ?? colors.tint);

  const label = typeof children === "string" || typeof children === "number" ? String(children) : undefined;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size={18} color={foreground} />
      ) : icon ? (
        <Icon source={icon} size={20} color={foreground} />
      ) : null}
      <Text
        style={[variant === "plain" ? styles.plainLabel : styles.label, { color: foreground }, labelStyle]}
        // Wraps to a second line rather than cutting off: some labels carry a total, and the
        // guide forbids truncating prices.
        numberOfLines={2}
      >
        {children}
      </Text>
    </>
  );

  const row = [styles.row, compact && styles.compact, variant === "plain" && styles.plainRow, contentStyle];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={({ pressed }) => [styles.base, style, pressed && styles.pressed]}
    >
      {variant === "primary" && !disabled ? (
        <BrandGradient raised style={[row, styles.shape]}>
          {content}
        </BrandGradient>
      ) : (
        <View
          style={[
            row,
            variant !== "plain" && styles.shape,
            variant === "secondary" && {
              backgroundColor: destructive && !disabled ? status.negative.container : colors.fill,
            },
            variant === "primary" && styles.disabledWell,
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
};

const createStyles = (theme: CustomTheme) => {
  const { colors, spacing, type, radius, touchTarget } = theme.custom;
  return StyleSheet.create({
    base: {
      borderRadius: radius.control,
    },
    pressed: {
      opacity: 0.7,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: touchTarget,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
    },
    compact: {
      paddingHorizontal: spacing.md,
    },
    plainRow: {
      paddingHorizontal: spacing.sm,
    },
    shape: {
      borderRadius: radius.control,
    },
    disabledWell: {
      backgroundColor: colors.fill,
    },
    label: {
      ...type.rowTitle,
      flexShrink: 1,
      textAlign: "center",
    },
    plainLabel: {
      ...type.body,
      fontWeight: "600",
      flexShrink: 1,
    },
  });
};

export default AppButton;
