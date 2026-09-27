/**
 * Pure rules for the driver's delivery attempts and departure (MSE-262). Kept free of React so
 * they are unit-testable; screens call them.
 */

const MAX_DOC_IN_KEY = 60;

/**
 * Idempotency key for ONE delivery submission. The server treats a repeat of the stop's latest key
 * as a retry (nothing is written twice) and any other key as a new attempt. Reuse it only while
 * retrying the exact same submission (same {@link huellaEnvio}); any change mints a new one.
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

/** Fields that vary on every tap without changing what the driver recorded. */
const CAMPOS_VOLATILES = new Set(["latitud", "longitud", "dispositivoId", "idempotencyKey"]);

/**
 * Stable fingerprint of what a delivery submission records (outcome, payment, note, photo, missing
 * items), ignoring GPS and device fields. Two submissions with the same fingerprint are the same
 * submission — a retry — so they may share an idempotency key; a corrected one must not.
 */
export function huellaEnvio(payload: object): string {
  const orden = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(orden)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v as Record<string, unknown>)
              .filter(([k, x]) => x !== undefined && !CAMPOS_VOLATILES.has(k))
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, orden(x)])
          )
        : v;
  return JSON.stringify(orden(payload));
}
