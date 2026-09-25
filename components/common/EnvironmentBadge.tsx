import Constants from "expo-constants";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CustomTheme } from "@/constants/Theme";

/**
 * A corner tag on every screen of a non-production build, so a tester with both
 * apps installed always knows which backend they are writing to. Renders nothing
 * in production.
 */
export default function EnvironmentBadge() {
  const insets = useSafeAreaInsets();
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const appEnv = Constants.expoConfig?.extra?.appEnv ?? "production";

  if (appEnv === "production") {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.badge, { top: insets.top + 2 }]}
      accessibilityLabel={`Environment: ${appEnv}`}
    >
      <Text style={styles.label}>DEV</Text>
    </View>
  );
}

// Solid warning tone with page-coloured text: loud enough to notice in both modes.
const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    badge: {
      position: "absolute",
      right: 8,
      zIndex: 1000,
      elevation: 10,
      backgroundColor: theme.custom.status.warning.base,
      borderRadius: theme.custom.radius.tag,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    label: {
      color: theme.custom.colors.background,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
  });
