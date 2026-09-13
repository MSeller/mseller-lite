import { Redirect } from "expo-router";
import React from "react";

// Kept so existing links keep working; the module now lives inside a grouped tab.
export default function LegacyEntregaRoute() {
  return <Redirect href={{ pathname: "/(tabs)/routes", params: { section: "deliveries" } }} />;
}
