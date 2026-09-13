import { useMemo } from "react";
import { useUser } from "../contexts/UserContext";
import type { UserTypes } from "../types/user";

/** A module the app can offer in its navigation. */
export type NavSection =
  | "documents"
  | "picking"
  | "deliveries"
  | "stockCount"
  | "products";

type UserType = UserTypes["type"];

const ALL: NavSection[] = ["documents", "picking", "deliveries", "stockCount", "products"];

/**
 * Which modules each user type is offered. This only shapes the menu — the Consumo
 * API is still what enforces access — so a user is never shown a module that would
 * answer 403, and never has to scroll past ones that are not part of their job.
 */
const SECTIONS_BY_USER_TYPE: Record<UserType, NavSection[]> = {
  seller: ["documents", "products"],
  driver: ["deliveries", "products"],
  inventory: ["documents", "picking", "stockCount", "products"],
  office: ["documents", "picking", "deliveries", "products"],
  accounting: ["documents", "products"],
  manager: ALL,
  administrator: ALL,
  superuser: ALL,
};

export interface NavigationAccess {
  /** True while the profile is still loading — nothing is offered yet. */
  loading: boolean;
  can: (section: NavSection) => boolean;
}

export const useNavigationAccess = (): NavigationAccess => {
  const { userProfile, loading } = useUser();

  return useMemo(() => {
    // While loading, or for a type this app does not know, offer nothing beyond
    // Home and More: a tab that appears and is then pulled away is worse than one
    // that shows up a moment later.
    const allowed = new Set<NavSection>(
      !loading && userProfile ? SECTIONS_BY_USER_TYPE[userProfile.type] ?? [] : [],
    );
    return {
      loading,
      can: (section: NavSection) => allowed.has(section),
    };
  }, [userProfile, loading]);
};
