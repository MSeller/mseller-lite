import { requireOptionalNativeModule } from "expo";

/**
 * Whether this app binary contains every named native module.
 *
 * Native modules only exist in a build made after their package was added, so a dev client
 * or store build can lag behind the JS it runs. Checking with `requireOptionalNativeModule`,
 * which answers null, BEFORE requiring a package is the reliable test. Wrapping the `require`
 * in a try/catch is not: Metro's module loader catches an error thrown while a module
 * evaluates, reports it to the error overlay and returns `undefined`, so the catch never runs.
 *
 * Pass the name each package asks for in its own `requireNativeModule(...)` call.
 */
export const hasNativeModules = (...nombres: string[]): boolean =>
  nombres.every((nombre) => !!requireOptionalNativeModule(nombre));
