import React from "react";

import RoutesModule from "../../components/modules/RoutesModule";
import ModuleTab from "../../components/navigation/ModuleTab";

export default function RoutesModuleTab() {
  return (
    <ModuleTab name="routes">
      <RoutesModule />
    </ModuleTab>
  );
}
