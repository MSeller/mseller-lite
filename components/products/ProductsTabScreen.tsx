import React, { useCallback, useState } from "react";
import ProductDetailScreen from "./ProductDetailScreen";
import ProductSearchScreen from "./ProductScreen";
import type { Product } from "../../types/inventory";

interface ProductsTabScreenProps {
  /** Shown only on the search screen, not on a product — the Inventario section switcher. */
  headerAccessory?: React.ReactNode;
}

/**
 * Inventario › Productos: the lookup, or one product's detail. A product registered from
 * the lookup comes back through `onProductSelect` too, so it opens exactly like a found one.
 */
export default function ProductsTabScreen({ headerAccessory }: ProductsTabScreenProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleNavigateBack = useCallback(() => setSelectedProduct(null), []);

  if (selectedProduct) {
    return (
      <ProductDetailScreen
        key={selectedProduct.codigo}
        product={selectedProduct}
        onBack={handleNavigateBack}
      />
    );
  }

  return <ProductSearchScreen onProductSelect={setSelectedProduct} headerAccessory={headerAccessory} />;
}
