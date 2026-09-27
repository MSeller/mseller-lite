import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

import StockModule from "../../components/modules/StockModule";
import { useNavigationAccess } from "../../hooks/useNavigationAccess";

/** Inventario as a tab. Roles that reach it from Más are sent to that copy instead. */
export default function StockTab() {
  const { isTab, loading } = useNavigationAccess();
  const { section } = useLocalSearchParams<{ section?: string }>();
  if (!loading && !isTab("stock")) {
    return <Redirect href={{ pathname: "/(tabs)/more/stock", params: section ? { section } : {} }} />;
  }
  return <StockModule />;
}
