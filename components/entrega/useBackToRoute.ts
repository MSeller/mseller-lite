import { useRouter } from "expo-router";
import { useCallback } from "react";

/**
 * Back from a screen inside a delivery route (Carga, a factura). Opened from a link there is
 * no history to pop, so it falls back to the route itself rather than doing nothing.
 */
export const useBackToRoute = (rutaId?: string) => {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(`/entrega/${rutaId ?? ""}` as never);
  }, [router, rutaId]);
};
