import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { TouchableRipple, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";

interface Props {
  children: React.ReactNode;
  /** `plain` = white content surface. `inset` = recessed panel (totals, summaries). */
  variant?: "plain" | "inset";
  /** Drop the hairline edge — for a card that already sits inside another surface. */
  borderless?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * The app's content container.
 *
 * Exists so every screen gets the same treatment: a surface separated from the
 * page by TONE and a hairline, never by a drop shadow. Paper's `Card` with
 * `mode="elevated"` gives the default Material look this design system is
 * deliberately not — grey-tinted panels with a shadow halo under each one, which
 * stack into noise as soon as two cards sit next to each other.
 *
 * Reach for `variant="inset"` when a block should read as recessed into the card
 * it sits in (a totals panel, a summary strip) rather than raised off the page.
 */
const AppCard: React.FC<Props> = ({
  children,
  variant = "plain",
  borderless = false,
  onPress,
  style,
  contentStyle,
}) => {
  const theme = useTheme() as CustomTheme;
  const { surface, radius } = theme.custom;

  const base: StyleProp<ViewStyle> = [
    variant === "inset" ? surface.inset : surface.card,
    borderless && styles.borderless,
    style,
  ];

  if (!onPress) {
    return (
      <View style={base}>
        <View style={contentStyle}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[base, styles.clip]}>
      <TouchableRipple
        onPress={onPress}
        style={[{ borderRadius: radius.md }, contentStyle]}
        borderless
      >
        <View>{children}</View>
      </TouchableRipple>
    </View>
  );
};

const styles = StyleSheet.create({
  borderless: {
    borderWidth: 0,
  },
  // Keeps the ripple inside the rounded corners instead of painting past them.
  clip: {
    overflow: "hidden",
  },
});

export default AppCard;
