import { Linking, Platform } from "react-native";
import { TipoVehiculo } from "../types/entrega";

export type MapProvider = "google" | "waze" | "apple";

export interface MapDestination {
  latitud?: number | null;
  longitud?: number | null;
  label?: string | null;
}

/** Whether we have usable coordinates to navigate to. */
export const hasCoords = (d: MapDestination): boolean =>
  typeof d.latitud === "number" &&
  typeof d.longitud === "number" &&
  !(d.latitud === 0 && d.longitud === 0);

/**
 * Builds a turn-by-turn navigation URL for the given provider. Consumer map apps don't
 * expose truck-specific routing via URL schemes, so we request driving mode; the assigned
 * vehicle type is surfaced in the UI so the driver can pick truck routing inside the app.
 */
export const buildMapUrl = (
  provider: MapProvider,
  d: MapDestination
): string | null => {
  if (!hasCoords(d)) return null;
  const lat = d.latitud as number;
  const lng = d.longitud as number;
  const label = encodeURIComponent(d.label ?? "");

  switch (provider) {
    case "google":
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    case "waze":
      return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    case "apple":
      return `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d${
        label ? `&q=${label}` : ""
      }`;
    default:
      return null;
  }
};

/** Opens the destination in the chosen navigation app. Returns false if it couldn't be opened. */
export const openInMaps = async (
  provider: MapProvider,
  d: MapDestination
): Promise<boolean> => {
  const url = buildMapUrl(provider, d);
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
};

/** Provider options to offer, most relevant first for the platform. */
export const mapProviderOptions = (): {
  provider: MapProvider;
  label: string;
  icon: string;
}[] => {
  const google = { provider: "google" as const, label: "Google Maps", icon: "google-maps" };
  const waze = { provider: "waze" as const, label: "Waze", icon: "navigation" };
  const apple = { provider: "apple" as const, label: "Apple Maps", icon: "map" };
  return Platform.OS === "ios" ? [google, waze, apple] : [google, waze];
};

/** Human label for the assigned vehicle type. */
export const vehiculoLabel = (tipo?: TipoVehiculo | null): string => {
  switch (tipo) {
    case "camion":
      return "Camión";
    case "furgoneta":
      return "Furgoneta";
    case "motocicleta":
      return "Motocicleta";
    case "otro":
      return "Vehículo";
    default:
      return "";
  }
};
