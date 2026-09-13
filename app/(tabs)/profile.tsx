import { Redirect } from "expo-router";
import React from "react";

// Kept so existing links keep working; the profile now lives in the Más tab.
export default function LegacyProfileRoute() {
  return <Redirect href="/(tabs)/more" />;
}
