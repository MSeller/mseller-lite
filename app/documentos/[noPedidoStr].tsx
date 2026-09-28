import { useLocalSearchParams } from "expo-router";
import React from "react";

import DocumentAccessGate from "../../components/documents/DocumentAccessGate";
import DocumentDetailScreen from "../../components/documents/DocumentDetailScreen";

export default function DocumentoDetalle() {
  // `?compartir=1` opens the print/send sheet at once — the "print this document" link.
  const { noPedidoStr, compartir } = useLocalSearchParams<{ noPedidoStr: string; compartir?: string }>();

  return (
    <DocumentAccessGate>
      <DocumentDetailScreen noPedidoStr={noPedidoStr ?? ""} shareOnOpen={compartir === "1"} />
    </DocumentAccessGate>
  );
}
