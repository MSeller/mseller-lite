import React from "react";

import CustomersCatalogScreen from "../../components/catalog/CustomersCatalogScreen";
import ProductsCatalogScreen from "../../components/catalog/ProductsCatalogScreen";
import GroupedTabScreen from "../../components/navigation/GroupedTabScreen";
import { useTranslation } from "../../hooks/useTranslation";

/** Catálogo: administrators edit the customer and product master data. */
export default function CatalogTab() {
  const { t } = useTranslation();

  return (
    <GroupedTabScreen
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
