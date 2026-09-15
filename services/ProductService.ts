import type { CreatedProduct, NewProductRequest, ProductImage, ProductPhoto } from "../types/documents";
import type { ProductoEditable, ProductoUpdateRequest } from "../types/catalog";
import type { Product } from "../types/inventory";
import { restClient } from "./api";

export interface ProductSearchResponse {
  data: Product[];
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalResults: number;
}

/**
 * Product Service - Handles product-related operations
 * Focused on product search, lookup, and catalog operations
 */
export class ProductService {
  private readonly baseEndpoint = "/consumo/Producto";

  /**
   * Search products by barcode
   */
  async buscarProductos(
    codigoBarra: string,
    pageNumber = 0,
    pageSize = 20
  ): Promise<ProductSearchResponse> {
    const response = await restClient.get(
      `${this.baseEndpoint}/buscar-productos?codigoBarra=${encodeURIComponent(
        codigoBarra
      )}&pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
    return response.data;
  }

  /**
   * Unified search method that handles different search types
   * Uses the existing buscar-productos endpoint with appropriate parameters
   */
  async buscarProductosUnificado(
    searchValue: string,
    searchType: "codigoBarra" | "codigo" | "texto" = "codigoBarra",
    pageNumber = 0,
    pageSize = 20
  ): Promise<ProductSearchResponse> {
    let queryParams = `pageNumber=${pageNumber}&pageSize=${pageSize}`;

    switch (searchType) {
      case "codigoBarra":
        queryParams += `&codigoBarra=${encodeURIComponent(searchValue)}`;
        break;
      case "codigo":
        // Try using the barcode endpoint with codigo parameter if supported
        // Or fallback to codigoBarra parameter
        queryParams += `&codigo=${encodeURIComponent(searchValue)}`;
        break;
      case "texto":
        // Try using the barcode endpoint with texto/nombre parameter if supported
        // Or fallback to codigoBarra parameter
        queryParams += `&texto=${encodeURIComponent(searchValue)}`;
        break;
    }

    const response = await restClient.get(
      `${this.baseEndpoint}/buscar-productos?${queryParams}`
    );
    return response.data;
  }

  /**
   * Free-text search for the document form's product picker.
   *
   * Uses the `query` parameter, which is the one the endpoint actually reads for
   * free text (it accepts `query`, `codigoProducto` and `codigoBarra` only) — so
   * this matches on code and name in a single call, which is what someone typing
   * into a picker expects.
   *
   * The endpoint answers 404 with an empty payload when nothing matches, so an
   * empty result is returned rather than letting a "no matches" read like a
   * failure. Its paging is 0-based.
   */
  async buscarParaDocumento(
    query: string,
    pageNumber = 0,
    pageSize = 20
  ): Promise<ProductSearchResponse> {
    const empty: ProductSearchResponse = {
      data: [],
      total: 0,
      pageNumber,
      pageSize,
      totalPages: 0,
      totalResults: 0,
    };

    try {
      const response = await restClient.get<ProductSearchResponse>(
        `${this.baseEndpoint}/buscar-productos`,
        { params: { query: query || undefined, pageNumber, pageSize } }
      );
      return response.data ?? empty;
    } catch (error: any) {
      if (error?.response?.status === 404) return empty;
      throw error;
    }
  }

  /**
   * Registers a product with only the basics (name + sale price), so capturing a
   * document never dead-ends on something that isn't in the catalogue yet.
   * Omitting `codigo` lets the server derive one from the name.
   */
  async crearProducto(request: NewProductRequest): Promise<CreatedProduct> {
    const response = await restClient.post<CreatedProduct>(this.baseEndpoint, request);
    return response.data;
  }

  /** The code a product with this name would get. A preview: nothing is reserved. */
  async siguienteCodigo(nombre: string): Promise<string | null> {
    const response = await restClient.get<{ codigo: string | null }>(
      `${this.baseEndpoint}/siguiente-codigo`,
      { params: { nombre } }
    );
    return response.data.codigo;
  }

  /**
   * Attaches photos already uploaded to the media library to an existing product, and
   * returns every image the product now has. Resending a photo that is already attached is
   * a no-op on the server, so a request that timed out can be retried safely.
   */
  async agregarImagenes(codigoProducto: string, imagenes: ProductPhoto[]): Promise<ProductImage[]> {
    const response = await restClient.post<ProductImage[]>(`${this.baseEndpoint}/imagenes`, {
      codigoProducto,
      imagenes,
    });
    return response.data;
  }

  /**
   * The full, editable product record for the admin Catálogo. Administrator and
   * superuser only: the server answers 403 for anyone else.
   */
  async obtenerEditable(codigo: string): Promise<ProductoEditable> {
    const response = await restClient.get<ProductoEditable>(
      `${this.baseEndpoint}/${encodeURIComponent(codigo)}/editable`
    );
    return response.data;
  }

  /** Saves the product and returns it as stored. 409 when the barcode belongs to another product. */
  async actualizar(codigo: string, request: ProductoUpdateRequest): Promise<ProductoEditable> {
    const response = await restClient.put<ProductoEditable>(
      `${this.baseEndpoint}/${encodeURIComponent(codigo)}`,
      request
    );
    return response.data;
  }
}

// Export singleton instance
export const productService = new ProductService();

// =============================================
// Convenience Functions
// =============================================

/**
 * Search products by barcode - Convenience function for UI components
 */
export const searchProducts = async (
  codigoBarra: string,
  pageNumber = 0,
  pageSize = 20
): Promise<ProductSearchResponse> => {
  return productService.buscarProductos(codigoBarra, pageNumber, pageSize);
};

/**
 * Search products by product code - Convenience function for UI components
 */
export const searchProductsByCode = async (
  codigo: string,
  pageNumber = 0,
  pageSize = 20
): Promise<ProductSearchResponse> => {
  return productService.buscarProductosUnificado(
    codigo,
    "codigo",
    pageNumber,
    pageSize
  );
};

/**
 * Search products by text/name - Convenience function for UI components
 */
export const searchProductsByText = async (
  texto: string,
  pageNumber = 0,
  pageSize = 20
): Promise<ProductSearchResponse> => {
  return productService.buscarProductosUnificado(
    texto,
    "texto",
    pageNumber,
    pageSize
  );
};

/**
 * Free-text product search for the document form - Convenience function for UI components
 */
export const searchProductsForDocument = async (
  query: string,
  pageNumber = 0,
  pageSize = 20
): Promise<ProductSearchResponse> => {
  return productService.buscarParaDocumento(query, pageNumber, pageSize);
};

/**
 * Quick product registration - Convenience function for UI components
 */
export const createProduct = async (request: NewProductRequest): Promise<CreatedProduct> => {
  return productService.crearProducto(request);
};

/**
 * Attach uploaded photos to an existing product - Convenience function for UI components
 */
export const addProductImages = async (
  codigoProducto: string,
  imagenes: ProductPhoto[]
): Promise<ProductImage[]> => productService.agregarImagenes(codigoProducto, imagenes);

/**
 * Suggested code for a new product - Convenience function for UI components
 */
export const getNextProductCode = async (nombre: string): Promise<string | null> =>
  productService.siguienteCodigo(nombre);

/**
 * Editable product record for the admin Catálogo - Convenience function for UI components
 */
export const getEditableProduct = (codigo: string): Promise<ProductoEditable> =>
  productService.obtenerEditable(codigo);

/**
 * Save a product from the admin Catálogo - Convenience function for UI components
 */
export const updateProduct = (
  codigo: string,
  request: ProductoUpdateRequest
): Promise<ProductoEditable> => productService.actualizar(codigo, request);
