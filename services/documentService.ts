import { restClient } from "./api";
import type {
  CreateDocumentRequest,
  DocumentDetail,
  DocumentListFilters,
  DocumentSummary,
  PagedResult,
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
}

export const documentService = new DocumentService();

export const createDocument = (request: CreateDocumentRequest) => documentService.create(request);
export const listDocuments = (filters?: DocumentListFilters) => documentService.list(filters);
export const getDocument = (noPedidoStr: string) => documentService.get(noPedidoStr);
