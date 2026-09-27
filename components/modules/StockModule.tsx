import React from "react";

import { useTranslation } from "../../hooks/useTranslation";
import InventoryTabScreen from "../inventory/InventoryTabScreen";
import GroupedTabScreen from "../navigation/GroupedTabScreen";
import ProductsTabScreen from "../products/ProductsTabScreen";

/** Inventario: Conteo / Productos. Rendered as a tab or under Más, with its header. */
export default function StockModule({ header }: { header?: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <GroupedTabScreen
      header={header}
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
