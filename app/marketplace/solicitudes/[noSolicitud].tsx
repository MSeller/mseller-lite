import { useLocalSearchParams } from "expo-router";
import React from "react";

import RequestDetailScreen from "../../../components/marketplace/RequestDetailScreen";

export default function SolicitudDetalle() {
  // `creada=1` is set by the checkout redirect so the screen leads with the confirmation.
  const { noSolicitud, creada } = useLocalSearchParams<{ noSolicitud: string; creada?: string }>();

  return <RequestDetailScreen noSolicitud={noSolicitud ?? ""} justCreated={creada === "1"} />;
}
