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

const mismoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Only meaningful on the route's own day — on any other day the driver is not at the door yet,
 * so it answers null. The windows are in the business's local time, which is the device's.
 */
export const estadoVentanas = (
  ventanas: VentanaEntrega[],
  fechaRuta: string | null | undefined,
  ahora: Date = new Date()
): EstadoVentana | null => {
  if (ventanas.length === 0 || !fechaRuta || !mismoDia(new Date(fechaRuta), ahora)) return null;
  const m = ahora.getHours() * 60 + ahora.getMinutes();
  if (ventanas.some((v) => m >= minutos(v.horaInicio) && m < minutos(v.horaFin))) return "open";
  if (ventanas.some((v) => m < minutos(v.horaInicio))) return "later";
  return "closed";
};
