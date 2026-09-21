import { useLocalSearchParams } from "expo-router";
import React from "react";

import RequestAccessScreen from "../../components/marketplace/RequestAccessScreen";

export default function SolicitarAcceso() {
  const { tiendaId, nombre } = useLocalSearchParams<{ tiendaId?: string; nombre?: string }>();

  return <RequestAccessScreen tiendaId={tiendaId} tiendaNombre={nombre} />;
}
