import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import React, { useContext, useMemo } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { gutterFor, type CustomTheme } from "@/constants/Theme";
import GradientButton from "../ui/GradientButton";

/**
 * Bottom padding that clears the home indicator. Inside the route's tab group the tab bar
 * already sits over it (React Navigation does not zero the screen's insets), so adding the
 * inset there would leave a gap above the tabs.
 */
export const useFooterBottomInset = (): number => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  return tabBarHeight > 0 ? 0 : insets.bottom;
};

interface Props {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** A quiet text action left of the CTA (Cancelar). */
  secondary?: { label: string; onPress: () => void; disabled?: boolean };
  /** Left column content (a figure with its overline); the CTA then hugs the right edge. */
  summary?: React.ReactNode;
}

/**
 * The pinned footer that holds the primary action of a preparation screen, with an optional
 * summary or secondary text action beside the gradient CTA.
 */
const PrepFooter: React.FC<Props> = ({
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
  secondary,
  summary,
}) => {
  const theme = useTheme() as CustomTheme;
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, gutterFor(width)), [theme, width]);
  const { spacing } = theme.custom;
  const bottomInset = useFooterBottomInset();
  const stretch = !summary && !secondary;

  return (
    <View style={[styles.footer, { paddingBottom: spacing.md + bottomInset }]}>
      {!!summary && <View style={styles.summary}>{summary}</View>}
      {!!secondary && (
        <Pressable
          onPress={secondary.onPress}
          disabled={secondary.disabled}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.secondary}
        >
          <Text style={[styles.secondaryLabel, secondary.disabled && styles.secondaryDisabled]}>
            {secondary.label}
          </Text>
        </Pressable>
      )}
      <GradientButton
        label={label}
        icon={icon}
        onPress={onPress}
        disabled={disabled}
        loading={loading}
        style={stretch ? styles.stretch : styles.hug}
      />
    </View>
  );
};

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, spacing, type, touchTarget, surface } = theme.custom;
  return StyleSheet.create({
    footer: {
      ...surface.floating,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
      paddingHorizontal: gutter,
      paddingTop: spacing.md,
    },
    summary: {
      flex: 1,
    },
    secondary: {
      minHeight: touchTarget,
      justifyContent: "center",
      flex: 1,
    },
    secondaryLabel: {
      ...type.body,
      color: colors.tint,
    },
    stretch: {
      flex: 1,
    },
    hug: {
      flexShrink: 1,
    },
    secondaryDisabled: {
      color: colors.inkTertiary,
    },
  });
};

export default PrepFooter;
