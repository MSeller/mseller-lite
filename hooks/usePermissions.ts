import { useEffect, useMemo, useState } from "react";
import { useUser } from "../contexts/UserContext";
import { getMyPermissions } from "../services/permissionService";
import type { UserPermissions } from "../types/user";

// One fetch per signed-in user, shared by every screen that asks; a failed fetch is
// retried on the next mount rather than cached as "no permissions".
const cache = new Map<string, Promise<UserPermissions>>();

export interface Permissions {
  /** True once the server has answered; until then every check is false. */
  ready: boolean;
  /** `modulo.permiso` on the user's role. Superusers bypass, as in the portal. */
  has: (modulo: string, permiso: string) => boolean;
}

/**
 * Role permissions from the portal's database (`hooks/usePermissions` in mseller-cloud is
 * the model): only superusers bypass, administrators are governed by their role like
 * everyone else. False until loaded, so nothing is offered that could be refused.
 */
export const usePermissions = (): Permissions => {
  const { user, userProfile } = useUser();
  const [data, setData] = useState<UserPermissions | null>(null);
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) {
      setData(null);
      return;
    }
    let active = true;
    let request = cache.get(uid);
    if (!request) {
      request = getMyPermissions();
      cache.set(uid, request);
    }
    request
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        cache.delete(uid);
      });
    return () => {
      active = false;
    };
  }, [uid]);

  return useMemo(() => {
    const superuser = data?.usuario?.tipo === "superuser" || userProfile?.type === "superuser";
    return {
      ready: !!data,
      has: (modulo: string, permiso: string) =>
        superuser || data?.permisos?.[modulo]?.[permiso] === true,
    };
  }, [data, userProfile?.type]);
};
