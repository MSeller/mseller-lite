import type { Ticket } from "../markup/types";
import type { DriverId, PrinterProfile } from "../profiles";

export interface EncodeOptions {
  /** Code page the server rendered for; overrides the profile's default. */
  codePage?: number | null;
}

/** Turns a parsed ticket into the exact bytes one printer language expects. Pure. */
export interface PrinterDriver {
  id: DriverId;
  encode(ticket: Ticket, profile: PrinterProfile, options?: EncodeOptions): Uint8Array;
}
