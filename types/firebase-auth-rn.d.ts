import type { Persistence, ReactNativeAsyncStorage } from "firebase/auth";

/**
 * Metro resolves firebase/auth to its React Native build, which exports
 * getReactNativePersistence, but the package's public types only describe the web build.
 */
declare module "firebase/auth" {
  export function getReactNativePersistence(
    storage: ReactNativeAsyncStorage,
  ): Persistence;
}
