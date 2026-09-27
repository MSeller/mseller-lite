import { Stack } from "expo-router";
import React from "react";

/**
 * Más holds account settings and the modules that are not worth a tab of their own
 * (Catálogo, Marketplace). They are pushed on this stack, so the Más tab stays
 * highlighted while they are open and the back arrow returns to the list.
 */
export default function MoreLayout() {
  // Every screen paints its own header, so the navigator's header is off.
  return <Stack screenOptions={{ headerShown: false }} />;
}
