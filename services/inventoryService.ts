import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BuscarProductoPorCodigoBarraResponse,
  ContarProductoPorCodigoBarraRequest,
  ContarProductoRequest,
  ContarProductoResponse,
  ContarProductoZonaRequest,
  InventarioConteo,
  InventarioZona,
  OperacionOffline,
  ProductoConteo,
  ProgresoZonas,
  ResumenConteo,
  SiguienteProductoZonaResponse,
  SincronizarConteoRequest,
  TipoOperacion,
  ValidarCodigoBarraResponse,
} from "../types/inventory";
import { restClient } from "./api";
import { MOCK_CONTEO, MOCK_PRODUCTOS_CONTEO, MOCK_RESUMEN } from "./mocks/inventoryFixtures";

/** Development builds started with `EXPO_PUBLIC_MOCK_INVENTORY=true` serve a sample count. */
const MOCK_INVENTORY = __DEV__ && process.env.EXPO_PUBLIC_MOCK_INVENTORY === "true";

/**
 * Inventory Mobile Service - Handles all mobile inventory operations
 * Integrates with MSeller Inventory Management API (Consumo.Api)
 */
export class InventoryMobileService {
  private readonly baseEndpoint = "/consumo/inventariomovil";
  private readonly zonesEndpoint = "/consumo/inventariozonas";

  // =============================================
  // Basic Inventory Operations
  // =============================================

  /**
   * Get active counts for a warehouse
   */
  async getConteosActivos(localidadId: number): Promise<InventarioConteo[]> {
    if (MOCK_INVENTORY) return [MOCK_CONTEO];
    const response = await restClient.get(
      `${this.baseEndpoint}/conteos-activos/${localidadId}`
    );
    console.log("Active counts response:", response.data);
    return response.data;
  }

  /**
   * Get current active count for a warehouse
   */
  async getConteoActivo(localidadId: number): Promise<InventarioConteo | null> {
    if (MOCK_INVENTORY) return MOCK_CONTEO;
    try {
      const response = await restClient.get(
        `${this.baseEndpoint}/conteo-activo/${localidadId}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No active count
      }
      throw error;
    }
  }

  /**
   * Get products for a specific count
   */
  async getProductosConteo(conteoId: number): Promise<ProductoConteo[]> {
    if (MOCK_INVENTORY) return MOCK_PRODUCTOS_CONTEO;
    const response = await restClient.get(
      `${this.baseEndpoint}/conteo/${conteoId}/productos`
    );
    return response.data;
  }

  /**
   * Get count summary/progress
   */
  async getResumenConteo(conteoId: number): Promise<ResumenConteo> {
    if (MOCK_INVENTORY) return MOCK_RESUMEN;
    const response = await restClient.get(
      `${this.baseEndpoint}/conteo/${conteoId}/resumen`
    );
    return response.data;
  }

  // =============================================
  // Product Counting Operations
  // =============================================

  /**
   * Count a product manually by product code
   */

  async contarProducto(
    request: ContarProductoRequest
  ): Promise<import("../types/inventory").ContarProductoResult> {
    const response = await restClient.post(
      `${this.baseEndpoint}/contar-producto`,
      request
    );
    return response.data;
  }

  /**
   * Count a product by barcode scan
   */

  async contarProductoPorCodigoBarra(
    request: ContarProductoPorCodigoBarraRequest
  ): Promise<import("../types/inventory").ContarProductoResult> {
    const response = await restClient.post(
      `${this.baseEndpoint}/contar-por-codigo-barra`,
      request
    );
    return response.data;
  }

  /**
   * Batch synchronize multiple counts (offline sync)
   */
  async sincronizarConteo(
    conteoId: number,
    operaciones: SincronizarConteoRequest[]
  ): Promise<boolean> {
    const response = await restClient.post(
      `${this.baseEndpoint}/sincronizar-conteo/${conteoId}`,
      operaciones
    );
    return response.data === true;
  }

  // =============================================
  // Barcode Operations
  // =============================================

  /**
   * Validate barcode format and existence
   */
  async validarCodigoBarra(
    codigoBarra: string,
    localidadId: number
  ): Promise<ValidarCodigoBarraResponse> {
    const response = await restClient.get(
      `${this.baseEndpoint}/validar-codigo-barra/${encodeURIComponent(
        codigoBarra
      )}/localidad/${localidadId}`
    );
    return response.data;
  }

  /**
   * Search product by barcode
   */
  async buscarPorCodigoBarra(
    codigoBarra: string,
    localidadId: number
  ): Promise<BuscarProductoPorCodigoBarraResponse> {
    const response = await restClient.get(
      `${this.baseEndpoint}/buscar-por-codigo-barra/${encodeURIComponent(
        codigoBarra
      )}/localidad/${localidadId}`
    );
    return response.data;
  }

  // =============================================
  // Zone Management (Systematic Counting)
  // =============================================

  /**
   * Generate zones for systematic counting
   */
  async generarZonas(
    conteoId: number,
    usuarios: string[]
  ): Promise<InventarioZona[]> {
    const response = await restClient.post(
      `${this.zonesEndpoint}/generar-zonas/${conteoId}`,
      { usuarios }
    );
    return response.data;
  }

  /**
   * Get user's assigned zone
   */
  async getMiZona(conteoId: number): Promise<InventarioZona> {
    const response = await restClient.get(
      `${this.zonesEndpoint}/mi-zona/${conteoId}`
    );
    return response.data;
  }

  /**
   * Get next product in systematic zone sequence
   */
  async getSiguienteProductoZona(
    zonaId: number
  ): Promise<SiguienteProductoZonaResponse> {
    const response = await restClient.get(
      `${this.zonesEndpoint}/siguiente-producto-zona/${zonaId}`
    );
    return response.data;
  }

  /**
   * Count product in systematic zone sequence
   */
  async contarProductoZona(
    request: ContarProductoZonaRequest
  ): Promise<ContarProductoResponse> {
    const response = await restClient.post(
      `${this.zonesEndpoint}/contar-producto-zona`,
      request
    );
    return response.data;
  }

  /**
   * Get zones progress for supervisors
   */
  async getProgresoZonas(conteoId: number): Promise<ProgresoZonas> {
    const response = await restClient.get(
      `${this.zonesEndpoint}/progreso-zonas/${conteoId}`
    );
    return response.data;
  }

  // =============================================
  // Utility Functions
  // =============================================

  /**
   * Get warehouse ID from user data
   */
  getWarehouseId(userWarehouse: string): number {
    const warehouseId = parseInt(userWarehouse, 10);
    if (isNaN(warehouseId)) {
      throw new Error(`Invalid warehouse ID: ${userWarehouse}`);
    }
    return warehouseId;
  }

  /**
   * Format product location for display
   */
  formatProductLocation(producto: ProductoConteo): string {
    if (producto.ubicacionDetallada) {
      return producto.ubicacionDetallada;
    }

    const parts = [];
    if (producto.zona) parts.push(`Zona ${producto.zona}`);
    if (producto.ubicacion) parts.push(producto.ubicacion);

    return parts.length > 0 ? parts.join(", ") : "Ubicación no especificada";
  }

  /**
   * Calculate discrepancy percentage
   */
  calculateDiscrepancyPercentage(
    cantidadSnapshot: number,
    cantidadContada: number
  ): number {
    if (cantidadSnapshot === 0) return cantidadContada > 0 ? 100 : 0;
    return ((cantidadContada - cantidadSnapshot) / cantidadSnapshot) * 100;
  }

  /**
   * Get device info for tracking
   */
  async getDeviceInfo(): Promise<{ id: string; tipo: string }> {
    try {
      // Simple device ID generation - in production, use a more robust solution
      let storedDeviceId = await AsyncStorage.getItem("deviceId");

      if (!storedDeviceId) {
        storedDeviceId = `MOBILE_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        await AsyncStorage.setItem("deviceId", storedDeviceId);
      }

      return {
        id: storedDeviceId,
        tipo: "Tablet", // Default for mobile app
      };
    } catch {
      // Fallback if AsyncStorage fails
      return {
        id: `MOBILE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tipo: "Tablet",
      };
    }
  }
}

/**
 * Offline Operations Manager
 * Handles operations when device is offline
 */
export class InventoryOfflineManager {
  private readonly storageKey = "inventory_offline_operations";

  /**
   * Add operation to offline queue
   */
  async addOfflineOperation(tipo: TipoOperacion, datos: any): Promise<void> {
    try {
      const operations = await this.getOfflineOperations();
      const newOperation: OperacionOffline = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tipo,
        datos,
        timestamp: new Date().toISOString(),
        sincronizado: false,
        intentos: 0,
      };

      operations.push(newOperation);
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(operations));
    } catch (error) {
      console.error("Error adding offline operation:", error);
    }
  }

  /**
   * Get pending offline operations
   */
  async getOfflineOperations(): Promise<OperacionOffline[]> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error getting offline operations:", error);
      return [];
    }
  }

  /**
   * Mark operation as synchronized
   */
  async markOperationSynced(operationId: string): Promise<void> {
    try {
      const operations = await this.getOfflineOperations();
      const updated = operations.map((op) =>
        op.id === operationId ? { ...op, sincronizado: true } : op
      );
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error("Error marking operation as synced:", error);
    }
  }

  /**
   * Get count of pending operations
   */
  async getPendingOperationsCount(): Promise<number> {
    try {
      const operations = await this.getOfflineOperations();
      return operations.filter((op) => !op.sincronizado).length;
    } catch (error) {
      console.error("Error getting pending operations count:", error);
      return 0;
    }
  }

  /**
   * Clear all synchronized operations
   */
  async clearSyncedOperations(): Promise<void> {
    try {
      const operations = await this.getOfflineOperations();
      const pending = operations.filter((op) => !op.sincronizado);
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(pending));
    } catch (error) {
      console.error("Error clearing synced operations:", error);
    }
  }

  /**
   * Attempt to sync pending operations
   */
  async syncPendingOperations(
    inventoryService: InventoryMobileService
  ): Promise<{ success: number; failed: number }> {
    const operations = (await this.getOfflineOperations()).filter(
      (op) => !op.sincronizado
    );

    let success = 0;
    let failed = 0;

    for (const operation of operations) {
      try {
        switch (operation.tipo) {
          case TipoOperacion.ContarProducto:
            await inventoryService.contarProducto(operation.datos);
            break;
          case TipoOperacion.ContarPorCodigoBarra:
            await inventoryService.contarProductoPorCodigoBarra(
              operation.datos
            );
            break;
          // Add more operation types as needed
        }

        await this.markOperationSynced(operation.id);
        success++;
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        failed++;
      }
    }

    // Clean up synced operations
    await this.clearSyncedOperations();

    return { success, failed };
  }
}

// Export singleton instances
export const inventoryService = new InventoryMobileService();
export const offlineManager = new InventoryOfflineManager();
