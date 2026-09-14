import type { DriverId } from "../profiles";
import { escPosDriver } from "./escpos";
import type { PrinterDriver } from "./types";

/** Every printer language the app speaks. Register new drivers (ZPL, Star…) here. */
const DRIVERS: Record<DriverId, PrinterDriver> = {
  escpos: escPosDriver,
};

export const getDriver = (id: DriverId): PrinterDriver => {
  const driver = DRIVERS[id];
  if (!driver) throw new Error(`Unknown printer driver: ${id}`);
  return driver;
};

export type { PrinterDriver } from "./types";
