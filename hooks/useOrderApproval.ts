import { useMemo } from "react";
import { useUser } from "../contexts/UserContext";
import type { DocumentDetail, DocumentSummary } from "../types/documents";
import type { UserTypes } from "../types/user";
import { usePermissions, type Permissions } from "./usePermissions";

/** Roles that never approve: the Consumo API blocks them on the status endpoint too. */
const NEVER_APPROVE: readonly UserTypes["type"][] = ["driver", "inventory"];

/** Whether an order is waiting for someone to approve or reject it. */
export const isAwaitingApproval = (
  document: Pick<DocumentDetail | DocumentSummary, "tipoDocumento" | "procesado" | "anulado">,
) => document.tipoDocumento === "order" && document.procesado === "pendiente" && !document.anulado;

/**
 * Approving orders is the role permission `pedidos.aprobar` from the portal's database,
 * the same one its order list honours. The workflow itself — what "approved" moves the
 * order to — is the business's, resolved by the server.
 */
export const canApproveOrders = (
  profile: UserTypes | null,
  permissions: Pick<Permissions, "ready" | "has">,
): boolean =>
  !!profile &&
  !NEVER_APPROVE.includes(profile.type) &&
  permissions.ready &&
  permissions.has("pedidos", "aprobar");

export const useOrderApproval = () => {
  const { userProfile, loading } = useUser();
  const permissions = usePermissions();
  return useMemo(
    () => ({ canApprove: !loading && canApproveOrders(userProfile, permissions), loading }),
    [userProfile, loading, permissions],
  );
};
