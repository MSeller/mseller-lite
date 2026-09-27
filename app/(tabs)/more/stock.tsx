import React from "react";

import StockModule from "../../../components/modules/StockModule";
import ModuleHeader from "../../../components/navigation/ModuleHeader";
import { useModuleMeta } from "../../../components/navigation/moduleMeta";

/** Inventario (or just Productos) opened from Más. */
export default function MoreStockScreen() {
  const meta = useModuleMeta();
  return <StockModule header={<ModuleHeader title={meta.stock.title} />} />;
}
