import { restClient } from "./api";
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
  async search(
    query: string,
    { soloMisClientes = true, pageNumber = 1, pageSize = 20 } = {}
  ): Promise<PagedResult<CustomerSummary>> {
    const response = await restClient.get<PagedResult<CustomerSummary>>(`${BASE}/buscar`, {
      params: { query: query || undefined, soloMisClientes, pageNumber, pageSize },
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
}

export const customerService = new CustomerService();

export const searchCustomers = (query: string, options?: Parameters<CustomerService["search"]>[1]) =>
  customerService.search(query, options);
export const createCustomer = (request: NewCustomerRequest) => customerService.create(request);
