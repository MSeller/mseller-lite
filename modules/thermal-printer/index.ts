import { requireOptionalNativeModule } from "expo";

import type { ThermalPrinterNativeModule } from "./src/ThermalPrinter.types";

export * from "./src/ThermalPrinter.types";

/**
 * The native printer transport, or null where it does not exist: web, Expo Go, and any
 * installed build older than this module. Callers must check before use — see
 * utils/nativeModules.ts for why a null check beats try/catch around `require`.
 */
export const ThermalPrinter = requireOptionalNativeModule<ThermalPrinterNativeModule>("ThermalPrinter");
