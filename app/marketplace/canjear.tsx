import { useLocalSearchParams } from "expo-router";
import React from "react";

import RedeemCodeScreen from "../../components/marketplace/RedeemCodeScreen";

export default function CanjearCodigo() {
  // `nombre` is only for the wording — the code alone identifies the store server-side.
  const { nombre } = useLocalSearchParams<{ tiendaId?: string; nombre?: string }>();

  return <RedeemCodeScreen tiendaNombre={nombre} />;
}
