import { describe, expect, it } from "@jest/globals";

import { estadoVentanas, formatVentanas } from "../deliveryWindow";

const ventanas = [
  { horaInicio: "08:00", horaFin: "12:00" },
  { horaInicio: "14:00", horaFin: "17:30" },
];
// Local times on the route's day (the route date and "now" are both device-local here).
const at = (h: number, m = 0) => new Date(2026, 9, 5, h, m);
const fechaRuta = new Date(2026, 9, 5, 7, 0).toISOString();

describe("formatVentanas", () => {
  it("joins the windows", () => {
    expect(formatVentanas(ventanas)).toBe("08:00 – 12:00 · 14:00 – 17:30");
  });
});

describe("estadoVentanas", () => {
  it("is open inside a window and later between or before them", () => {
    expect(estadoVentanas(ventanas, fechaRuta, at(9))).toBe("open");
    expect(estadoVentanas(ventanas, fechaRuta, at(12, 30))).toBe("later");
    expect(estadoVentanas(ventanas, fechaRuta, at(7))).toBe("later");
  });

  it("treats the end of a window as closed", () => {
    expect(estadoVentanas(ventanas, fechaRuta, at(17, 30))).toBe("closed");
  });

  it("compares a date-only route date as a calendar date", () => {
    // Read as UTC midnight this would be the previous local day west of UTC.
    expect(estadoVentanas(ventanas, "2026-10-05", at(9))).toBe("open");
    expect(estadoVentanas(ventanas, "2026-10-06", at(9))).toBeNull();
  });

  it("says nothing on another day or without windows", () => {
    expect(estadoVentanas(ventanas, fechaRuta, new Date(2026, 9, 6, 9))).toBeNull();
    expect(estadoVentanas([], fechaRuta, at(9))).toBeNull();
    expect(estadoVentanas(ventanas, null, at(9))).toBeNull();
  });
});
