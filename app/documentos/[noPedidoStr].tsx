import { useLocalSearchParams } from "expo-router";
import React from "react";

import DocumentAccessGate from "../../components/documents/DocumentAccessGate";
import DocumentDetailScreen from "../../components/documents/DocumentDetailScreen";

export default function DocumentoDetalle() {
  const { noPedidoStr } = useLocalSearchParams<{ noPedidoStr: string }>();

  return (
    <DocumentAccessGate>
      <DocumentDetailScreen noPedidoStr={noPedidoStr ?? ""} />
    </DocumentAccessGate>
  );
}
