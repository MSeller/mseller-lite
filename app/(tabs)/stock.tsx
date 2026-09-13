import React from "react";

import InventoryTabScreen from "../../components/inventory/InventoryTabScreen";
import GroupedTabScreen from "../../components/navigation/GroupedTabScreen";
import ProductsTabScreen from "../../components/products/ProductsTabScreen";
import { useTranslation } from "../../hooks/useTranslation";

export default function StockTab() {
  const { t } = useTranslation();

  return (
    <GroupedTabScreen
      sections={[
        { value: "stockCount", label: t("navigation.sections.stockCount"), icon: "clipboard-check-outline" },
        { value: "products", label: t("navigation.sections.products"), icon: "barcode" },
      ]}
      renderSection={(section, switcher) =>
        section === "stockCount" ? (
          <InventoryTabScreen headerAccessory={switcher} />
        ) : (
          <ProductsTabScreen headerAccessory={switcher} />
        )
      }
    />
  );
}
