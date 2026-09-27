import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

import CatalogModule from "../../components/modules/CatalogModule";
import { useNavigationAccess } from "../../hooks/useNavigationAccess";

/** Catálogo as a tab. Roles that reach it from Más are sent to that copy instead. */
export default function CatalogTab() {
  const { isTab, loading } = useNavigationAccess();
  const { section } = useLocalSearchParams<{ section?: string }>();
  if (!loading && !isTab("catalog")) {
    return <Redirect href={{ pathname: "/(tabs)/more/catalog", params: section ? { section } : {} }} />;
  }
  return <CatalogModule />;
}
