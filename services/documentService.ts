import { restClient } from "./api";
import type {
  CreateDocumentRequest,
  DocumentDetail,
  DocumentListFilters,
  DocumentShareHistory,
  DocumentSend,
  DocumentSummary,
  DocumentTicket,
  PagedResult,
  SendDocumentRequest,
} from "../types/documents";

const BASE = "/consumo/Documento";

/**
 * Online document capture. Every call here needs the network — the lite app
 * deliberately has no offline queue for documents, so callers surface failures
 * to the user instead of retrying silently in the background.
 */
export class DocumentService {
  /**
   * Creates an invoice, order or quote and returns the document the server
   * actually persisted. The totals and the document number come back from the
   * server; whatever the form showed was a preview.
   */
  async create(request: CreateDocumentRequest): Promise<DocumentDetail> {
    const response = await restClient.post<DocumentDetail>(BASE, request);
    return response.data;
  }

  async list(filters: DocumentListFilters = {}): Promise<PagedResult<DocumentSummary>> {
    const {
      tipoDocumento,
      codigoCliente,
      query,
      dates,
      // Defaults to false — "as wide as this user's role allows", NOT "everything".
      // The server decides scope from the role on the token: a field seller is confined
      // to documents credited to their own seller code no matter what this flag says
      // (AlcanceVendedor), so sending true adds no security and actively hurts the roles
      // it does not confine — an administrator or owner carrying a seller code saw only
      // documents credited to that code, which is an empty list on most tenants.
      soloMisDocumentos = false,
      pageNumber = 1,
      pageSize = 20,
    } = filters;

    const params: Record<string, string | number | boolean> = {
      soloMisDocumentos,
      pageNumber,
      pageSize,
    };

    if (tipoDocumento) {
      params.tipoDocumento = Array.isArray(tipoDocumento)
        ? tipoDocumento.join(",")
        : tipoDocumento;
    }
    if (codigoCliente) params.codigoCliente = codigoCliente;
    if (query) params.query = query;
    if (dates) params.dates = dates;

    const response = await restClient.get<PagedResult<DocumentSummary>>(BASE, { params });
    return response.data;
  }

  async get(noPedidoStr: string): Promise<DocumentDetail> {
    const response = await restClient.get<DocumentDetail>(
      `${BASE}/${encodeURIComponent(noPedidoStr)}`
    );
    return response.data;
  }

  // ── Print, PDF and email ──────────────────────────────────────────────────

  /**
   * The document's PDF, as raw bytes.
   *
   * Fetched through `restClient` rather than pointed at with a plain URL because the
   * endpoint is authenticated: an `<Image>`/`<a href>` carries no bearer token and would
   * get a 401. The caller turns these bytes into an object URL (web) or a cache file
   * (iOS/Android).
   *
   * `preview` exists so opening the viewer does not record a print. The history is what
   * labels the action "Re-print", and a document nobody printed should not claim otherwise.
   */
  async getPdf(noPedidoStr: string, { preview = false } = {}): Promise<ArrayBuffer> {
    // arraybuffer rather than blob so one response type serves both platforms: React
    // Native's Blob carries no `arrayBuffer()`, so bytes fetched as a Blob cannot be
    // written to a file on a phone, and the web side builds a Blob from these bytes in
    // one line. Fetching through restClient (rather than expo-file-system's downloader)
    // keeps the Firebase token on the one interceptor that already owns it.
    const response = await restClient.get<ArrayBuffer>(
      `${BASE}/${encodeURIComponent(noPedidoStr)}/pdf`,
      {
        params: { registrarImpresion: !preview },
        responseType: "arraybuffer",
      }
    );
    return response.data;
  }

  /**
   * The document laid out as a thermal-printer ticket: marker text (`<<C>>`, `<<B>>`, `<<QR>>`…)
   * at `ancho` columns, which services/printing encodes for the printer on this device.
   *
   * `registrarImpresion` defaults to false, the opposite of getPdf: fetching a ticket is
   * usually for the preview, and only the actual print should count as one in the history.
   */
  async getTicket(
    noPedidoStr: string,
    { ancho = 48, registrarImpresion = false }: { ancho?: 32 | 48; registrarImpresion?: boolean } = {}
  ): Promise<DocumentTicket> {
    const response = await restClient.get<DocumentTicket>(
      `${BASE}/${encodeURIComponent(noPedidoStr)}/ticket`,
      { params: { ancho, registrarImpresion } }
    );
    return response.data;
  }

  /** Queues the document to be emailed. Resolves as soon as it is queued, not delivered. */
  async send(noPedidoStr: string, request: SendDocumentRequest = {}): Promise<DocumentSend> {
    const response = await restClient.post<DocumentSend>(
      `${BASE}/${encodeURIComponent(noPedidoStr)}/enviar`,
      request
    );
    return response.data;
  }

  /** Re-sends a previous email, optionally somewhere else. */
  async resend(envioId: string, destinatarios?: string[]): Promise<DocumentSend> {
    const response = await restClient.post<DocumentSend>(
      `${BASE}/envios/${encodeURIComponent(envioId)}/reenviar`,
      { destinatarios }
    );
    return response.data;
  }

  async getShareHistory(noPedidoStr: string): Promise<DocumentShareHistory> {
    const response = await restClient.get<DocumentShareHistory>(
      `${BASE}/${encodeURIComponent(noPedidoStr)}/compartir`
    );
    return response.data;
  }
}

export const documentService = new DocumentService();

export const createDocument = (request: CreateDocumentRequest) => documentService.create(request);
export const listDocuments = (filters?: DocumentListFilters) => documentService.list(filters);
export const getDocument = (noPedidoStr: string) => documentService.get(noPedidoStr);
export const getDocumentPdf = (noPedidoStr: string, options?: { preview?: boolean }) =>
  documentService.getPdf(noPedidoStr, options);
export const getDocumentTicket = (
  noPedidoStr: string,
  options?: { ancho?: 32 | 48; registrarImpresion?: boolean }
) => documentService.getTicket(noPedidoStr, options);
export const sendDocument = (noPedidoStr: string, request?: SendDocumentRequest) =>
  documentService.send(noPedidoStr, request);
export const resendDocument = (envioId: string, destinatarios?: string[]) =>
  documentService.resend(envioId, destinatarios);
export const getDocumentShareHistory = (noPedidoStr: string) =>
  documentService.getShareHistory(noPedidoStr);
