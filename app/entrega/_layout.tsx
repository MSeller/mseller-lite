import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "react-native-paper";

import type { CustomTheme } from "@/constants/Theme";

export default function EntregaLayout() {
  const theme = useTheme() as CustomTheme;
  // The page tone behind transitions, so a push never flashes a different colour in dark mode.
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.custom.colors.background } }}
    />
  );
}
