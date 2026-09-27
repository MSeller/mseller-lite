import { Redirect } from "expo-router";
import React from "react";

import PickingRoutesScreen from "../../components/routes/PickingRoutesScreen";
import { useNavigationAccess } from "../../hooks/useNavigationAccess";

/**
 * Carga: the driver's list of routes ready to load onto the truck. Everyone else loads
 * from Preparación, so they are sent there.
 */
export default function LoadingTab() {
  const { isTab, loading } = useNavigationAccess();
  if (!loading && !isTab("loading")) {
    return <Redirect href={{ pathname: "/(tabs)/routes", params: { section: "picking" } }} />;
  }
  return <PickingRoutesScreen mode="loading" />;
}
