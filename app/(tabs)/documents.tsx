import React from "react";

import DocumentAccessGate from "../../components/documents/DocumentAccessGate";
import DocumentsListScreen from "../../components/documents/DocumentsListScreen";

export default function DocumentsTab() {
  return (
    <DocumentAccessGate>
      <DocumentsListScreen />
    </DocumentAccessGate>
  );
}
