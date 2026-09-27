/**
 * Pure rules for the driver's delivery attempts and departure (MSE-262). Kept free of React so
 * they are unit-testable; screens call them.
 */

const MAX_DOC_IN_KEY = 60;

/**
 * Idempotency key for ONE delivery tap. The server treats a repeat of the stop's latest key as a
 * retry (nothing is written twice) and any other key as a new attempt. Mint it when the driver
 * opens an outcome dialog and reuse it while retrying that same submission.
 */
export function nuevaClaveIntento(
  noPedidoStr: string,
  now: number = Date.now(),
  random: () => number = Math.random
): string {
  const doc = noPedidoStr.slice(0, MAX_DOC_IN_KEY);
  const sufijo = Math.floor(random() * 36 ** 6).toString(36).padStart(6, "0");
  return `${doc}-${now.toString(36)}-${sufijo}`;
}

/**
 * Whether the driver can leave on the route: every listed stop is loaded and no stop is still
 * waiting for an invoice (those are not listed to the driver, only counted).
 */
export function puedeSalirARuta(p: { total: number; cargados: number; pendientesFacturar?: number }): boolean {
  return p.total > 0 && p.cargados === p.total && (p.pendientesFacturar ?? 0) === 0;
}
