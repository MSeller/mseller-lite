import * as Location from "expo-location";

export interface Coords {
  latitud: number;
  longitud: number;
}

/**
 * Best-effort current position for stamping a delivery. Requests foreground permission and
 * returns coordinates, or null if permission is denied or location is unavailable — a delivery
 * must never be blocked by GPS (the backend accepts null coordinates).
 */
export const getCurrentCoords = async (): Promise<Coords | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitud: pos.coords.latitude, longitud: pos.coords.longitude };
  } catch {
    return null;
  }
};
