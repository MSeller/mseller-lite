import Constants from "expo-constants";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * A corner tag on every screen of a non-production build, so a tester with both
 * apps installed always knows which backend they are writing to. Renders nothing
 * in production.
 */
export default function EnvironmentBadge() {
  const insets = useSafeAreaInsets();
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

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: 8,
    zIndex: 1000,
    elevation: 10,
    backgroundColor: "#D97706",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
