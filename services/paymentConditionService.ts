import { restClient } from "./api";

export interface PaymentCondition {
  id: number;
  condicionPago: string;
  descripcion: string;
  dias: number;
  tipo_condicion?: string | null;
}

/**
 * The tenant's payment conditions. A small, rarely-changing catalogue, so it is
 * fetched whole rather than paged.
 *
 * The endpoint answers 404 when the tenant has none configured; that is an empty
 * catalogue, not a failure, so it comes back as an empty array. The document
 * form then has nothing to offer and says so, which is the honest outcome —
 * documents cannot be captured until someone configures one.
 */
export const listPaymentConditions = async (): Promise<PaymentCondition[]> => {
  try {
    const response = await restClient.get<PaymentCondition[]>("/consumo/CondicionPago");
    return response.data ?? [];
  } catch (error: any) {
    if (error?.response?.status === 404) return [];
    throw error;
  }
};
