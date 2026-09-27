import React from "react";

import RoutesModule from "../../../components/modules/RoutesModule";
import ModuleHeader from "../../../components/navigation/ModuleHeader";
import { useModuleMeta } from "../../../components/navigation/moduleMeta";

/** Rutas opened from Más. */
export default function MoreRoutesScreen() {
  const meta = useModuleMeta();
  return <RoutesModule header={<ModuleHeader title={meta.routes.title} />} />;
}
