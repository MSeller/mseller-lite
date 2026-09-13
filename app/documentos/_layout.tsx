import { Stack } from "expo-router";
import React from "react";

export default function DocumentosLayout() {
  // Each screen renders its own Appbar, so the navigator header stays off.
  return <Stack screenOptions={{ headerShown: false }} />;
}
