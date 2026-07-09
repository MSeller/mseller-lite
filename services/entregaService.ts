import {
  CargaResponse,
  ConfirmarCargaResponse,
  ItemCargaConfirmacion,
} from "../types/preparacion";
import {
  EntregaFacturaDetalle,
  EntregaRuta,
  EntregaRutaDetalle,
  PagedResult,
  RegistrarEntregaRequest,
  RegistrarEntregaResponse,
} from "../types/entrega";
import { restClient } from "./api";

export interface EntregaRutaFiltros {
  fecha?: string;
  status?: string;
}

/**
 * Entrega Service — driver-facing delivery flow.
 * All endpoints target Consumo.Api (/consumo/entrega) and are scoped server-side to the
 * authenticated driver (JWT sellerCode). The carga (load) endpoints delegate to the same
 * backend logic as Preparación but with route-ownership enforced.
 */
class EntregaService {
  private readonly baseEndpoint = "/consumo/entrega";

  /** List the driver's routes (active one flagged via esActiva). */
  async getRutas(
    filtros?: EntregaRutaFiltros,
    pageNumber = 1,
    pageSize = 50
  ): Promise<PagedResult<EntregaRuta>> {
    const { data } = await restClient.get<PagedResult<EntregaRuta>>(
      `${this.baseEndpoint}/rutas`,
      { params: { pageNumber, pageSize, ...filtros } }
    );
    return data;
  }

  /** Route header + ordered invoice list. */
  async getRuta(rutaId: number): Promise<EntregaRutaDetalle> {
    const { data } = await restClient.get<EntregaRutaDetalle>(
      `${this.baseEndpoint}/rutas/${rutaId}`
    );
    return data;
  }

  /** Load-the-truck view (LIFO by delivery sequence). */
  async getCarga(rutaId: number): Promise<CargaResponse> {
    const { data } = await restClient.get<CargaResponse>(
      `${this.baseEndpoint}/rutas/${rutaId}/carga`
    );
    return data;
  }

  /** Confirm load of one invoice; auto-dispatches the route to en_ruta when all are loaded. */
  async confirmarCarga(
    rutaId: number,
    rutaDetalleId: number,
    items?: ItemCargaConfirmacion[]
  ): Promise<ConfirmarCargaResponse> {
    const { data } = await restClient.post<ConfirmarCargaResponse>(
      `${this.baseEndpoint}/rutas/${rutaId}/confirmar-carga/${rutaDetalleId}`,
      items ? { items } : undefined
    );
    return data;
  }

  /** Full detail of a single invoice/stop. */
  async getFactura(
    rutaId: number,
    noPedidoStr: string
  ): Promise<EntregaFacturaDetalle> {
    const { data } = await restClient.get<EntregaFacturaDetalle>(
      `${this.baseEndpoint}/rutas/${rutaId}/facturas/${encodeURIComponent(
        noPedidoStr
      )}`
    );
    return data;
  }

  /** Record a delivery outcome (delivered / partial / not-delivered). Idempotent. */
  async registrarEntrega(
    rutaId: number,
    noPedidoStr: string,
    payload: RegistrarEntregaRequest
  ): Promise<RegistrarEntregaResponse> {
    const { data } = await restClient.post<RegistrarEntregaResponse>(
      `${this.baseEndpoint}/rutas/${rutaId}/facturas/${encodeURIComponent(
        noPedidoStr
      )}/entregar`,
      payload
    );
    return data;
  }

  /** Close the transport → route completada (only when all stops are terminal, unless forced). */
  async completarRuta(rutaId: number, forzar = false): Promise<EntregaRuta> {
    const { data } = await restClient.post<EntregaRuta>(
      `${this.baseEndpoint}/rutas/${rutaId}/completar`,
      undefined,
      { params: { forzar } }
    );
    return data;
  }
}

export const entregaService = new EntregaService();
