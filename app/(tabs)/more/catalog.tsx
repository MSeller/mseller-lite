import React from "react";

import CatalogModule from "../../../components/modules/CatalogModule";
import ModuleHeader from "../../../components/navigation/ModuleHeader";
import { useModuleMeta } from "../../../components/navigation/moduleMeta";

/** Catálogo opened from Más. */
export default function MoreCatalogScreen() {
  const meta = useModuleMeta();
  return <CatalogModule header={<ModuleHeader title={meta.catalog.title} />} />;
}
