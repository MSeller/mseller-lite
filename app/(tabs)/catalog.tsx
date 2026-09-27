import React from "react";

import CatalogModule from "../../components/modules/CatalogModule";
import ModuleTab from "../../components/navigation/ModuleTab";

export default function CatalogModuleTab() {
  return (
    <ModuleTab name="catalog">
      <CatalogModule />
    </ModuleTab>
  );
}
