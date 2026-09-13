import React from "react";

import GroupedTabScreen from "../../components/navigation/GroupedTabScreen";
import DeliveryRoutesScreen from "../../components/routes/DeliveryRoutesScreen";
import PickingRoutesScreen from "../../components/routes/PickingRoutesScreen";
import { useTranslation } from "../../hooks/useTranslation";

export default function RoutesTab() {
  const { t } = useTranslation();

  return (
    <GroupedTabScreen
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
