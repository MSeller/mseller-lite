import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking } from "react-native";

import { locationReadiness, type LocationProblem } from "../utils/deliveryLocation";

export interface DeliveryLocation {
  /** Null when an attempt can be stamped; otherwise why not. Null too while the first check runs. */
  problem: LocationProblem | null;
  /** Asks for permission when it still can, else opens the app's Settings page. */
  resolve: () => Promise<void>;
  recheck: () => Promise<void>;
}

/**
 * Keeps a delivery screen honest about location: checked on mount and every time the app comes
 * back to the foreground — which is where the driver lands after turning location on in Settings.
 */
export const useDeliveryLocation = (): DeliveryLocation => {
  const [problem, setProblem] = useState<LocationProblem | null>(null);

  const recheck = useCallback(async () => {
    setProblem(await locationReadiness());
  }, []);

  useEffect(() => {
    recheck();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") recheck();
    });
    return () => subscription.remove();
  }, [recheck]);

  const resolve = useCallback(async () => {
    if (problem === "denied") {
      await Location.requestForegroundPermissionsAsync();
    } else {
      // Switched off or refused for good: only the system settings can change that.
      await Linking.openSettings();
    }
    await recheck();
  }, [problem, recheck]);

  return { problem, resolve, recheck };
};
