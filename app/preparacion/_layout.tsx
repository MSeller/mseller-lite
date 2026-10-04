import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "react-native-paper";
import type { CustomTheme } from "@/constants/Theme";

export default function PreparacionLayout() {
  const theme = useTheme() as CustomTheme;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // The page tone behind transitions, so a push does not flash the navigator's grey in dark mode.
        contentStyle: { backgroundColor: theme.custom.colors.background },
      }}
    />
  );
}
