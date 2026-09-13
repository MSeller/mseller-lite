import { useMemo } from "react";
import { useUser } from "../contexts/UserContext";

/**
 * User types that may NOT capture documents.
 *
 * A driver delivers documents that already exist — they never create one. The
 * Consumo API enforces this too (the document endpoints answer 403 for a
 * driver); this hook is what keeps the UI from offering an action that would be
 * refused, which is the difference between a considered product and a broken one.
 */
const BLOCKED_USER_TYPES = ["driver"] as const;

export interface DocumentAccess {
  /** True when the signed-in user may see and capture documents. */
  canCreateDocuments: boolean;
  /** True while the profile is still loading — don't decide anything yet. */
  loading: boolean;
  /** Seller code to attribute captured documents to, when the profile has one. */
  sellerCode?: string;
}

export const useDocumentAccess = (): DocumentAccess => {
  const { userProfile, loading } = useUser();

  return useMemo(() => {
    const userType = userProfile?.type;
    const blocked =
      !!userType && BLOCKED_USER_TYPES.includes(userType as (typeof BLOCKED_USER_TYPES)[number]);

    return {
      // While the profile loads, assume no access: flashing the tab and then
      // pulling it away is worse than showing it a moment later.
      canCreateDocuments: !loading && !!userProfile && !blocked,
      loading,
      sellerCode: userProfile?.sellerCode,
    };
  }, [userProfile, loading]);
};
