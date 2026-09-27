import { Redirect } from "expo-router";
import React from "react";

import MarketplaceDirectoryScreen from "../../components/marketplace/MarketplaceDirectoryScreen";
import { useNavigationAccess } from "../../hooks/useNavigationAccess";

/** Marketplace as a tab. Roles that reach it from Más are sent to that copy instead. */
export default function MarketplaceTab() {
  const { isTab, loading } = useNavigationAccess();
  if (!loading && !isTab("marketplace")) {
    return <Redirect href="/(tabs)/more/marketplace" />;
  }
  return <MarketplaceDirectoryScreen />;
}
