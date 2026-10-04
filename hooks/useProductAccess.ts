import { useMemo } from "react";

import { useUser } from "../contexts/UserContext";

/**
 * User types that may NOT register a product. Mirrors the Consumo API, which closes
 * `POST /consumo/Producto` to the driver (`[BloquearTipoUsuario(Driver)]`): a driver delivers
 * what was ordered and never captures a document that would need a new product.
 */
const BLOCKED_USER_TYPES: readonly string[] = ["driver"];

export interface ProductAccess {
  /** True when the signed-in user may register a new product. False while the profile loads. */
  canCreateProducts: boolean;
  loading: boolean;
}

export const useProductAccess = (): ProductAccess => {
  const { userProfile, loading } = useUser();
  return useMemo(
    () => ({
      canCreateProducts: !loading && !!userProfile && !BLOCKED_USER_TYPES.includes(userProfile.type),
      loading,
    }),
    [userProfile, loading]
  );
};
