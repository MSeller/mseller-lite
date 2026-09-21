import { useLocalSearchParams } from "expo-router";
import React from "react";

import CartScreen from "../../../components/marketplace/CartScreen";

export default function CarritoTienda() {
  const { tiendaId, nombre } = useLocalSearchParams<{ tiendaId: string; nombre?: string }>();

  return <CartScreen tiendaId={tiendaId ?? ""} tiendaNombre={nombre ?? ""} />;
}
