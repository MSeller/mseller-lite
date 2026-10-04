import type { VentanaEntrega } from "../types/entrega";

/** "08:00 – 12:00 · 14:00 – 17:30" */
export const formatVentanas = (ventanas: VentanaEntrega[]): string =>
  ventanas.map((v) => `${v.horaInicio} – ${v.horaFin}`).join(" · ");

/** Where "now" falls against today's windows: inside one, before the next, or past them all. */
export type EstadoVentana = "open" | "later" | "closed";

const minutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

const fechaLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Whether the route runs on `ahora`'s local day. A date-only value ("2026-10-05") is a calendar
 * date and is compared as one: `new Date()` would read it as UTC midnight, which west of UTC is
 * still the previous local day. A timestamp is converted to the device's local day.
 */
const esDiaDeRuta = (fechaRuta: string, ahora: Date) =>
  (/^\d{4}-\d{2}-\d{2}$/.test(fechaRuta) ? fechaRuta : fechaLocal(new Date(fechaRuta))) === fechaLocal(ahora);

/**
 * Only meaningful on the route's own day — on any other day the driver is not at the door yet,
 * so it answers null. The windows are in the business's local time, which is the device's.
 */
export const estadoVentanas = (
  ventanas: VentanaEntrega[],
  fechaRuta: string | null | undefined,
  ahora: Date = new Date()
): EstadoVentana | null => {
  if (ventanas.length === 0 || !fechaRuta || !esDiaDeRuta(fechaRuta, ahora)) return null;
  const m = ahora.getHours() * 60 + ahora.getMinutes();
  if (ventanas.some((v) => m >= minutos(v.horaInicio) && m < minutos(v.horaFin))) return "open";
  if (ventanas.some((v) => m < minutos(v.horaInicio))) return "later";
  return "closed";
};
