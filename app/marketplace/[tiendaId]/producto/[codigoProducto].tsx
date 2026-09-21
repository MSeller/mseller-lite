import { useLocalSearchParams } from "expo-router";
import React from "react";

import StoreProductDetailScreen from "../../../../components/marketplace/StoreProductDetailScreen";

export default function ProductoTienda() {
  const { tiendaId, codigoProducto, nombre } = useLocalSearchParams<{
    tiendaId: string;
    codigoProducto: string;
    nombre?: string;
  }>();

  return (
    <StoreProductDetailScreen
      tiendaId={tiendaId ?? ""}
      tiendaNombre={nombre ?? ""}
      codigoProducto={codigoProducto ?? ""}
    />
  );
}
