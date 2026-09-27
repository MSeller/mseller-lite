import React from "react";

import { useTranslation } from "../../hooks/useTranslation";
import CustomersCatalogScreen from "../catalog/CustomersCatalogScreen";
import ProductsCatalogScreen from "../catalog/ProductsCatalogScreen";
import GroupedTabScreen from "../navigation/GroupedTabScreen";

/** Catálogo: edit the customer and product master data. As a tab or under Más. */
export default function CatalogModule({ header }: { header?: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <GroupedTabScreen
      header={header}
      sections={[
        {
          value: "catalogCustomers",
          label: t("navigation.sections.catalogCustomers"),
          icon: "account-group-outline",
        },
        {
          value: "catalogProducts",
          label: t("navigation.sections.catalogProducts"),
          icon: "package-variant-closed",
        },
      ]}
      renderSection={(section, switcher) =>
        section === "catalogCustomers" ? (
          <CustomersCatalogScreen headerAccessory={switcher} />
        ) : (
          <ProductsCatalogScreen headerAccessory={switcher} />
        )
      }
    />
  );
}
