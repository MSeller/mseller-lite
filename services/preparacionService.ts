import {
  CargaResponse,
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

  /**
   * M5 — Truck load status (LIFO order), read-only for the office. Answers 409
   * ESPERANDO_FACTURACION until the invoices are assigned to the driver.
   */
  async getCarga(rutaId: number): Promise<CargaResponse> {
    const response = await restClient.get<CargaResponse>(
      `${this.baseEndpoint}/${rutaId}/carga`
    );
    return response.data;
  }

  // Confirming / declining a load is the driver's job (MSE-255): see entregaService.
}

export const preparacionService = new PreparacionService();
