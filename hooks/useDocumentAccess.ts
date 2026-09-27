import { useMemo } from "react";
import { useUser } from "../contexts/UserContext";
import { DOCUMENT_TYPES, type DocumentType } from "../types/documents";
import type { UserTypes } from "../types/user";

/**
 * User types that may NOT capture documents.
 *
 * A driver delivers documents that already exist — they never create one. The
 * Consumo API enforces this too (the document endpoints answer 403 for a
 * driver); this hook is what keeps the UI from offering an action that would be
 * refused, which is the difference between a considered product and a broken one.
 */
const BLOCKED_USER_TYPES = ["driver"] as const;

/**
 * The document types this user may create: the per-user switches from mseller-cloud
 * (missing on older users, which means all), minus quotes when the business has them
 * turned off. Pure so the rule is testable without the profile source.
 */
export const allowedDocumentTypesFor = (profile: UserTypes | null): DocumentType[] => {
  if (!profile) return [];
  const blocked = BLOCKED_USER_TYPES.includes(profile.type as (typeof BLOCKED_USER_TYPES)[number]);
  if (blocked) return [];
  const perUser = profile.documentTypes;
  const quotesOff = profile.business?.config?.allowQuote === false;
  return DOCUMENT_TYPES.filter((type) => {
    if (perUser && perUser[type] === false) return false;
    if (type === "quote" && quotesOff) return false;
    return true;
  });
};

export interface DocumentAccess {
  /** True when the signed-in user may see and capture documents. */
  canCreateDocuments: boolean;
  /** The types the user may create, in the order the form offers them. */
  allowedDocumentTypes: DocumentType[];
  /** True while the profile is still loading — don't decide anything yet. */
  loading: boolean;
  /** Seller code to attribute captured documents to, when the profile has one. */
  sellerCode?: string;
}

export const useDocumentAccess = (): DocumentAccess => {
  const { userProfile, loading } = useUser();

  return useMemo(() => {
    // While the profile loads, assume no access: flashing the tab and then
    // pulling it away is worse than showing it a moment later.
    const allowedDocumentTypes = loading ? [] : allowedDocumentTypesFor(userProfile);

    return {
      canCreateDocuments: allowedDocumentTypes.length > 0,
      allowedDocumentTypes,
      loading,
      sellerCode: userProfile?.sellerCode,
    };
  }, [userProfile, loading]);
};
