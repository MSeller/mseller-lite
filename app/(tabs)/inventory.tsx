import { Redirect } from "expo-router";
import React from "react";

// Kept so existing links keep working; the module now lives inside a grouped tab.
export default function LegacyInventoryRoute() {
  return <Redirect href={{ pathname: "/(tabs)/stock", params: { section: "stockCount" } }} />;
}
