import * as Location from "expo-location";

export interface Coords {
  latitud: number;
  longitud: number;
}

/**
 * Why there is no position to stamp an attempt with:
 * - `servicesOff`: location is switched off on the device.
 * - `denied`: the app has not been allowed yet and can still ask.
 * - `blocked`: the user refused and the system will not ask again — only Settings fixes it.
 * - `unavailable`: allowed and on, but no fix came back (indoors, no signal).
 */
export type LocationProblem = "servicesOff" | "denied" | "blocked" | "unavailable";

export type LocationResult = { ok: true; coords: Coords } | { ok: false; problem: LocationProblem };

/** How long to wait for a fresh fix before falling back to the last known position. */
const FIX_TIMEOUT_MS = 15_000;
/** A last known position is only good enough if it is this recent and this precise. */
const LAST_KNOWN_MAX_AGE_MS = 2 * 60_000;
const LAST_KNOWN_MAX_ACCURACY_M = 200;

/** Whether an attempt could be stamped right now, without asking or locating: null when ready. */
export const locationReadiness = async (): Promise<LocationProblem | null> => {
  try {
    if (!(await Location.hasServicesEnabledAsync())) return "servicesOff";
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.granted) return null;
    return permission.canAskAgain ? "denied" : "blocked";
  } catch {
    return "unavailable";
  }
};

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

/**
 * The device's position for stamping a delivery attempt. Every outcome must carry one — the API
 * rejects an attempt without it — so this asks for permission when it still can and reports why
 * when there is no position, instead of letting the attempt go out without one.
 */
export const requireCurrentCoords = async (): Promise<LocationResult> => {
  try {
    if (!(await Location.hasServicesEnabledAsync())) return { ok: false, problem: "servicesOff" };
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { ok: false, problem: permission.canAskAgain ? "denied" : "blocked" };

    const fresh = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      FIX_TIMEOUT_MS
    );
    const position =
      fresh ??
      (await Location.getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_MAX_AGE_MS,
        requiredAccuracy: LAST_KNOWN_MAX_ACCURACY_M,
      }));
    if (!position) return { ok: false, problem: "unavailable" };
    return { ok: true, coords: { latitud: position.coords.latitude, longitud: position.coords.longitude } };
  } catch {
    return { ok: false, problem: "unavailable" };
  }
};
