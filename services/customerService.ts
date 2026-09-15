import { restClient } from "./api";
import type { ClienteEditable, ClienteUpdateRequest } from "../types/catalog";
import type {
  CreatedCustomer,
  CustomerSummary,
  NewCustomerRequest,
  PagedResult,
} from "../types/documents";

const BASE = "/consumo/Cliente";

/**
 * Customer lookup and quick registration for the document form.
 *
 * `search` hits the paginated `buscar` endpoint, not `GET /consumo/Cliente?vendedor=`
 * — that one returns a seller's entire book in one payload for the offline app to
 * sync, which is the wrong shape for a picker on a phone.
 */
export class CustomerService {
  /**
   * `incluirInactivos` lists inactive customers too (with their `status`). The server
   * honours it for administrators and superusers only and ignores it for anyone else.
   */
  async search(
    query: string,
    { soloMisClientes = true, incluirInactivos = false, pageNumber = 1, pageSize = 20 } = {}
  ): Promise<PagedResult<CustomerSummary>> {
    const response = await restClient.get<PagedResult<CustomerSummary>>(`${BASE}/buscar`, {
      params: {
        query: query || undefined,
        soloMisClientes,
        incluirInactivos: incluirInactivos || undefined,
        pageNumber,
        pageSize,
      },
    });
    return response.data;
  }

  /**
   * Registers a customer with only the basics. Omitting `codigo` lets the server
   * assign the next code from the tenant's CLI-… sequence.
   */
  async create(request: NewCustomerRequest): Promise<CreatedCustomer> {
    const response = await restClient.post<CreatedCustomer>(BASE, request);
    return response.data;
  }

  /** The code the next customer would get. A preview: nothing is reserved. */
  async nextCode(): Promise<string | null> {
    const response = await restClient.get<{ codigo: string | null }>(`${BASE}/siguiente-codigo`);
    return response.data.codigo;
  }
}

/**
 * The full, editable customer record for the admin Catálogo. Administrator and
 * superuser only: the server answers 403 for anyone else.
 */
export const getEditableCustomer = async (codigo: string): Promise<ClienteEditable> => {
  const response = await restClient.get<ClienteEditable>(
    `${BASE}/${encodeURIComponent(codigo)}/editable`
  );
  return response.data;
};

/** Saves the customer and returns the record as stored. 400 / 403 / 404 carry `{ message }`. */
export const updateCustomer = async (
  codigo: string,
  request: ClienteUpdateRequest
): Promise<ClienteEditable> => {
  const response = await restClient.put<ClienteEditable>(
    `${BASE}/${encodeURIComponent(codigo)}`,
    request
  );
  return response.data;
};

export const customerService = new CustomerService();

export const searchCustomers = (query: string, options?: Parameters<CustomerService["search"]>[1]) =>
  customerService.search(query, options);
export const createCustomer = (request: NewCustomerRequest) => customerService.create(request);
export const getNextCustomerCode = () => customerService.nextCode();
