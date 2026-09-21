import type {
  CatalogoFiltros,
  CrearSolicitudRequest,
  PagedResult,
  ProductoCatalogo,
  ProductoCatalogoDetalle,
  RedimirCodigoRequest,
  SolicitarVinculoRequest,
  SolicitudB2B,
  SolicitudFiltros,
  TiendaFiltros,
  TiendaMarketplace,
  VendedorContacto,
  VinculoB2B,
} from "../types/b2b";
import { restClient } from "./api";

const BASE = "/consumo/b2b";

/**
 * Marketplace B2B, buyer side.
 *
 * Everything here needs the network — like documents, the lite app has no offline
 * queue for these, so callers surface failures instead of retrying in the background.
 *
 * Two endpoints are rate limited to 10 requests a minute (redeeming a code and
 * requesting access) and answer 429; the screens read that status and say to wait
 * rather than showing a generic failure.
 */
export class B2BService {
  // ── Directory and links ───────────────────────────────────────────────────

  /** The marketplace directory. Each row carries this buyer's link state with the store. */
  async listarTiendas({
    busqueda,
    pageNumber = 1,
    pageSize = 20,
  }: TiendaFiltros = {}): Promise<PagedResult<TiendaMarketplace>> {
    const response = await restClient.get<PagedResult<TiendaMarketplace>>(`${BASE}/tiendas`, {
      params: { busqueda: busqueda || undefined, pageNumber, pageSize },
    });
    return response.data;
  }

  /**
   * Redeems the invitation code a store's rep handed over, which links the two
   * accounts. 400 when the code is malformed or expired, 404 when it does not exist,
   * 409 when the link already exists, 429 when the buyer has tried too often.
   */
  async redimirCodigo(codigo: string): Promise<VinculoB2B> {
    const body: RedimirCodigoRequest = { codigo };
    const response = await restClient.post<VinculoB2B>(`${BASE}/vinculos/redimir`, body);
    return response.data;
  }

  /**
   * Asks a store for access when there is no code. The link comes back `pendiente`
   * until the store's rep approves it. Also rate limited.
   */
  async solicitarVinculo(request: SolicitarVinculoRequest): Promise<VinculoB2B> {
    const response = await restClient.post<VinculoB2B>(`${BASE}/vinculos/solicitar`, request);
    return response.data;
  }

  /** Every link this buyer has, whatever its state. */
  async listarVinculos({ pageNumber = 1, pageSize = 20 } = {}): Promise<PagedResult<VinculoB2B>> {
    const response = await restClient.get<PagedResult<VinculoB2B>>(`${BASE}/vinculos`, {
      params: { pageNumber, pageSize },
    });
    return response.data;
  }

  // ── Catalogue ─────────────────────────────────────────────────────────────

  /** The store's product categories, in the order it publishes them — the catalogue tabs. */
  async listarAreas(tiendaId: string): Promise<string[]> {
    const response = await restClient.get<string[]>(
      `${BASE}/tiendas/${encodeURIComponent(tiendaId)}/areas`
    );
    return response.data ?? [];
  }

  async listarCatalogo(
    tiendaId: string,
    { area, busqueda, pageNumber = 1, pageSize = 20 }: CatalogoFiltros = {}
  ): Promise<PagedResult<ProductoCatalogo>> {
    const response = await restClient.get<PagedResult<ProductoCatalogo>>(
      `${BASE}/tiendas/${encodeURIComponent(tiendaId)}/catalogo`,
      { params: { area: area || undefined, busqueda: busqueda || undefined, pageNumber, pageSize } }
    );
    return response.data;
  }

  /** One product with its full image gallery. */
  async obtenerProducto(
    tiendaId: string,
    codigoProducto: string
  ): Promise<ProductoCatalogoDetalle> {
    const response = await restClient.get<ProductoCatalogoDetalle>(
      `${BASE}/tiendas/${encodeURIComponent(tiendaId)}/catalogo/${encodeURIComponent(
        codigoProducto
      )}`
    );
    return response.data;
  }

  /**
   * The store's sales rep, or `null` when the store chooses not to share the contact.
   *
   * The API answers **204 No Content** for that case, which is a normal answer and not a
   * failure: axios resolves it with an empty body, so it is mapped to `null` here and the
   * caller simply renders nothing. Anything else (a 404, a network failure) still throws.
   */
  async obtenerVendedor(tiendaId: string): Promise<VendedorContacto | null> {
    const response = await restClient.get<VendedorContacto | "">(
      `${BASE}/tiendas/${encodeURIComponent(tiendaId)}/vendedor`
    );
    if (response.status === 204 || !response.data) return null;
    return response.data;
  }

  // ── Purchase requests ─────────────────────────────────────────────────────

  /**
   * Sends the cart as a purchase request. `idempotencyKey` is generated on the device
   * (`utils/b2b.newIdempotencyKey`) so a double tap or a retry after a timeout returns
   * the request that was already created instead of creating a second one.
   */
  async crearSolicitud(request: CrearSolicitudRequest): Promise<SolicitudB2B> {
    const response = await restClient.post<SolicitudB2B>(`${BASE}/solicitudes`, request);
    return response.data;
  }

  async listarSolicitudes({
    estado,
    pageNumber = 1,
    pageSize = 20,
  }: SolicitudFiltros = {}): Promise<PagedResult<SolicitudB2B>> {
    const response = await restClient.get<PagedResult<SolicitudB2B>>(`${BASE}/solicitudes`, {
      params: { estado: estado || undefined, pageNumber, pageSize },
    });
    return response.data;
  }

  async obtenerSolicitud(noSolicitud: string): Promise<SolicitudB2B> {
    const response = await restClient.get<SolicitudB2B>(
      `${BASE}/solicitudes/${encodeURIComponent(noSolicitud)}`
    );
    return response.data;
  }
}

export const b2bService = new B2BService();

// =============================================
// Convenience Functions
// =============================================

export const listStores = (filters?: TiendaFiltros) => b2bService.listarTiendas(filters);

export const redeemInvitationCode = (codigo: string) => b2bService.redimirCodigo(codigo);

export const requestStoreAccess = (request: SolicitarVinculoRequest) =>
  b2bService.solicitarVinculo(request);

export const listLinks = (params?: { pageNumber?: number; pageSize?: number }) =>
  b2bService.listarVinculos(params);

export const listStoreAreas = (tiendaId: string) => b2bService.listarAreas(tiendaId);

export const listStoreCatalog = (tiendaId: string, filters?: CatalogoFiltros) =>
  b2bService.listarCatalogo(tiendaId, filters);

export const getCatalogProduct = (tiendaId: string, codigoProducto: string) =>
  b2bService.obtenerProducto(tiendaId, codigoProducto);

export const getStoreSeller = (tiendaId: string) => b2bService.obtenerVendedor(tiendaId);

export const createPurchaseRequest = (request: CrearSolicitudRequest) =>
  b2bService.crearSolicitud(request);

export const listPurchaseRequests = (filters?: SolicitudFiltros) =>
  b2bService.listarSolicitudes(filters);

export const getPurchaseRequest = (noSolicitud: string) =>
  b2bService.obtenerSolicitud(noSolicitud);
