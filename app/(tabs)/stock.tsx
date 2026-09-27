import React from "react";

import StockModule from "../../components/modules/StockModule";
import ModuleTab from "../../components/navigation/ModuleTab";

export default function StockModuleTab() {
  return (
    <ModuleTab name="stock">
      <StockModule />
    </ModuleTab>
  );
}
