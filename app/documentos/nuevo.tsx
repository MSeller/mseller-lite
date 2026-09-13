import React from "react";

import DocumentAccessGate from "../../components/documents/DocumentAccessGate";
import DocumentCreateScreen from "../../components/documents/create/DocumentCreateScreen";

export default function NuevoDocumento() {
  return (
    <DocumentAccessGate>
      <DocumentCreateScreen />
    </DocumentAccessGate>
  );
}
