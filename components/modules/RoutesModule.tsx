import React from "react";

import { useTranslation } from "../../hooks/useTranslation";
import GroupedTabScreen from "../navigation/GroupedTabScreen";
import DeliveryRoutesScreen from "../routes/DeliveryRoutesScreen";
import PickingRoutesScreen from "../routes/PickingRoutesScreen";

/** Rutas: Preparación / Entregas. Rendered as a tab or under Más, with its header. */
export default function RoutesModule({ header }: { header?: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <GroupedTabScreen
      header={header}
      sections={[
        { value: "picking", label: t("navigation.sections.picking"), icon: "package-variant" },
        { value: "deliveries", label: t("navigation.sections.deliveries"), icon: "truck-outline" },
      ]}
      renderSection={(section, switcher) =>
        section === "picking" ? (
          <PickingRoutesScreen headerAccessory={switcher} />
        ) : (
          <DeliveryRoutesScreen headerAccessory={switcher} />
        )
      }
    />
  );
}
