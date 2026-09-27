import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

import RoutesModule from "../../components/modules/RoutesModule";
import { useNavigationAccess } from "../../hooks/useNavigationAccess";

/** Rutas as a tab. Roles that reach it from Más are sent to that copy instead. */
export default function RoutesTab() {
  const { isTab, loading } = useNavigationAccess();
  const { section } = useLocalSearchParams<{ section?: string }>();
  if (!loading && !isTab("routes")) {
    return <Redirect href={{ pathname: "/(tabs)/more/routes", params: section ? { section } : {} }} />;
  }
  return <RoutesModule />;
}
