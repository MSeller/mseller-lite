import { useLocalSearchParams } from "expo-router";
import React from "react";

import StoreCatalogScreen from "../../../components/marketplace/StoreCatalogScreen";

export default function CatalogoTienda() {
  const { tiendaId, nombre } = useLocalSearchParams<{ tiendaId: string; nombre?: string }>();

  return <StoreCatalogScreen tiendaId={tiendaId ?? ""} tiendaNombre={nombre ?? ""} />;
}
