import { useMemo } from "react";
import { useUser } from "../contexts/UserContext";
import type { DocumentDetail, DocumentSummary } from "../types/documents";
import type { UserTypes } from "../types/user";

/** Roles that never approve: the Consumo API blocks them on the status endpoint too. */
const NEVER_APPROVE: readonly UserTypes["type"][] = ["driver", "inventory"];

/** Whether an order is waiting for someone to approve or reject it. */
export const isAwaitingApproval = (document: Pick<DocumentDetail | DocumentSummary, "tipoDocumento" | "procesado" | "anulado">) =>
  document.tipoDocumento === "order" && document.procesado === "pendiente" && !document.anulado;

/**
 * Approving orders is a per-user permission set in mseller-cloud (`cloudAccess.orders.allowApprove`),
 * the same flag the portal's order list honours. The workflow itself — what "approved"
 * moves the order to — is the business's, resolved by the server.
 */
export const canApproveOrders = (profile: UserTypes | null): boolean =>
  !!profile && !NEVER_APPROVE.includes(profile.type) && profile.cloudAccess?.orders?.allowApprove === true;

export const useOrderApproval = () => {
  const { userProfile, loading } = useUser();
  return useMemo(
    () => ({ canApprove: !loading && canApproveOrders(userProfile), loading }),
    [userProfile, loading],
  );
};
