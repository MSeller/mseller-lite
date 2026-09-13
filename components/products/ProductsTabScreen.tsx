import React, { useState } from "react";
import ProductDetailScreen from "./ProductDetailScreen";
import ProductSearchScreen from "./ProductScreen";
import type { Product } from "../../types/inventory";

type ProductScreenType = "search" | "detail";

interface ProductsTabScreenProps {
  /** Shown only on the search screen, not on a product — the Inventario section switcher. */
  headerAccessory?: React.ReactNode;
}

export default function ProductsTabScreen({ headerAccessory }: ProductsTabScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<ProductScreenType>("search");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setCurrentScreen("detail");
  };

  const handleNavigateBack = () => {
    setCurrentScreen("search");
    setSelectedProduct(null);
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case "search":
        return <ProductSearchScreen onProductSelect={handleProductSelect} headerAccessory={headerAccessory} />;
      case "detail":
        return (
          selectedProduct && (
            <ProductDetailScreen
              product={selectedProduct}
              onBack={handleNavigateBack}
            />
          )
        );
      default:
        return <ProductSearchScreen onProductSelect={handleProductSelect} headerAccessory={headerAccessory} />;
    }
  };

  return renderCurrentScreen();
}
