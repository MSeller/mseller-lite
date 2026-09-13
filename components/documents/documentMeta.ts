import type { DocumentType } from "../../types/documents";

/**
 * Presentation metadata for document types and statuses.
 *
 * Kept in one place so the list, the detail screen and the create wizard label
 * and colour a document the same way — a "Factura" must never be a "Pedido" one
 * screen over. The `labelKey` values resolve against the `documents` i18n
 * namespace; nothing here holds display text.
 */

export interface DocumentTypeMeta {
  /** MaterialCommunityIcons name, as react-native-paper's default adapter expects. */
  icon: string;
  labelKey: string;
  /** Key of a theme colour role used as the accent for this type. */
  accent: "primary" | "secondary" | "tertiary";
}

export const DOCUMENT_TYPE_META: Record<DocumentType, DocumentTypeMeta> = {
  invoice: { icon: "receipt", labelKey: "documents.type.invoice", accent: "primary" },
  order: { icon: "clipboard-text-outline", labelKey: "documents.type.order", accent: "secondary" },
  quote: { icon: "file-document-edit-outline", labelKey: "documents.type.quote", accent: "tertiary" },
};

export const getDocumentTypeMeta = (tipo: string): DocumentTypeMeta =>
  DOCUMENT_TYPE_META[tipo as DocumentType] ?? {
    icon: "file-outline",
    labelKey: "documents.type.other",
    accent: "primary",
  };

/**
 * How a processing status should read. `tone` drives the chip colour:
 * - `positive` — the document moved forward (approved, invoiced, sent to ERP)
 * - `pending`  — waiting on something (the normal state right after capture)
 * - `warning`  — needs a human (held, credit condition, backorder)
 * - `negative` — rejected or errored
 */
export type StatusTone = "positive" | "pending" | "warning" | "negative";

interface StatusMeta {
  labelKey: string;
  tone: StatusTone;
}

const STATUS_META: Record<string, StatusMeta> = {
  pendiente: { labelKey: "documents.status.pendiente", tone: "pending" },
  procesado: { labelKey: "documents.status.procesado", tone: "positive" },
  retenido: { labelKey: "documents.status.retenido", tone: "warning" },
  pendineteImprimir: { labelKey: "documents.status.pendienteImprimir", tone: "pending" },
  condicionCredito: { labelKey: "documents.status.condicionCredito", tone: "warning" },
  backorder: { labelKey: "documents.status.backorder", tone: "warning" },
  errorIntegracion: { labelKey: "documents.status.errorIntegracion", tone: "negative" },
  listoIntegrar: { labelKey: "documents.status.listoIntegrar", tone: "positive" },
  enviadoErp: { labelKey: "documents.status.enviadoErp", tone: "positive" },
  aprobadoDespacho: { labelKey: "documents.status.aprobadoDespacho", tone: "positive" },
  rechazado: { labelKey: "documents.status.rechazado", tone: "negative" },
  enDespacho: { labelKey: "documents.status.enDespacho", tone: "positive" },
  borrador: { labelKey: "documents.status.borrador", tone: "pending" },
};

export const getStatusMeta = (procesado: string): StatusMeta =>
  STATUS_META[procesado] ?? { labelKey: "documents.status.unknown", tone: "pending" };
