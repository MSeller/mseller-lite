import {
  CargaResponse,
  ConfirmarCargaBody,
  ConfirmarCargaResponse,
  ConfirmarProductoRequest,
  ConsolidadoResponse,
  RutaPreparacion,
  SummaryResponse,
} from "../types/preparacion";
import { restClient } from "./api";

/**
 * Preparación Service — handles all O2D wave-picking API calls.
 * All endpoints target Consumo.Api (/consumo/preparacion).
 */
class PreparacionService {
  private readonly baseEndpoint = "/consumo/preparacion";

  /** List routes available for picking (en_preparacion / lista_despacho) */
  async getRutasPreparacion(): Promise<RutaPreparacion[]> {
    const response = await restClient.get<RutaPreparacion[]>(
      `${this.baseEndpoint}/rutas`
    );
    return response.data;
  }

  /** M1 — Get consolidated picking list grouped by zone */
  async getConsolidado(rutaId: number): Promise<ConsolidadoResponse> {
    const response = await restClient.get<ConsolidadoResponse>(
      `${this.baseEndpoint}/${rutaId}/consolidado`
    );
    return response.data;
  }

  /** M2 — Confirm picked product and distribute across clients */
  async confirmarProducto(data: ConfirmarProductoRequest): Promise<void> {
    await restClient.post(`${this.baseEndpoint}/confirmar-producto`, data);
  }

  /** Mark route preparation as complete */
  async completarPreparacion(rutaId: number): Promise<void> {
    await restClient.post(`${this.baseEndpoint}/${rutaId}/completar`);
  }

  /** M4 — Get preparation summary (zone + per-client breakdown) */
  async getSummary(rutaId: number): Promise<SummaryResponse> {
    const response = await restClient.get<SummaryResponse>(
      `${this.baseEndpoint}/${rutaId}/resumen`
    );
    return response.data;
  }

  /** M5 — Get truck loading view (LIFO order) */
  async getCarga(rutaId: number): Promise<CargaResponse> {
    const response = await restClient.get<CargaResponse>(
      `${this.baseEndpoint}/${rutaId}/carga`
    );
    return response.data;
  }

  /** M5 — Confirm one invoice is loaded. Pass itemsFaltantes to confirm-with-issue (report a shortage). */
  async confirmarCarga(
    rutaId: number,
    rutaDetalleId: number,
    body?: ConfirmarCargaBody
  ): Promise<ConfirmarCargaResponse> {
    const { data } = await restClient.post<ConfirmarCargaResponse>(
      `${this.baseEndpoint}/${rutaId}/confirmar-carga/${rutaDetalleId}`,
      body ?? undefined
    );
    return data;
  }

  /** Decline (hold back) one invoice at load time — excluded from this route. */
  async rechazarCarga(
    rutaId: number,
    rutaDetalleId: number,
    observacion?: string
  ): Promise<ConfirmarCargaResponse> {
    const { data } = await restClient.post<ConfirmarCargaResponse>(
      `${this.baseEndpoint}/${rutaId}/rechazar-carga/${rutaDetalleId}`,
      observacion ? { observacion } : undefined
    );
    return data;
  }
}

export const preparacionService = new PreparacionService();
