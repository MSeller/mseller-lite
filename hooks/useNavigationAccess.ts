import { useMemo } from "react";
import { useUser } from "../contexts/UserContext";
import type { UserTypes } from "../types/user";

/** A module the app can offer in its navigation. */
export type NavSection =
  | "documents"
  | "picking"
  /** Loading a prepared route onto the truck from Preparación. Not for inventory pickers. */
  | "truckLoading"
  | "deliveries"
  | "stockCount"
  | "products"
  /** Catálogo › Clientes: browse and edit the customer master. Administrators only. */
  | "catalogCustomers"
  /** Catálogo › Productos: browse and edit the product master. Administrators only. */
  | "catalogProducts";

type UserType = UserTypes["type"];

/** Every operational module — what a manager sees. */
const OPERATIONS: NavSection[] = ["documents", "picking", "truckLoading", "deliveries", "stockCount", "products"];

/**
 * Editing master data (customers, products) is an administrator job: the Consumo API
 * answers 403 to everyone else, so no other role is offered the Catálogo tab.
 */
const ADMINISTRATION: NavSection[] = [...OPERATIONS, "catalogCustomers", "catalogProducts"];

/**
 * Which modules each user type is offered. This only shapes the menu — the Consumo
 * API is still what enforces access — so a user is never shown a module that would
 * answer 403, and never has to scroll past ones that are not part of their job.
 */
export const SECTIONS_BY_USER_TYPE: Readonly<Record<UserType, readonly NavSection[]>> = {
  seller: ["documents", "products"],
  driver: ["deliveries", "products"],
  // Pickers work Rutas (preparación only — the driver loads the truck) and Inventario.
  inventory: ["picking", "stockCount", "products"],
  office: ["documents", "picking", "truckLoading", "deliveries", "products"],
  accounting: ["documents", "products"],
  manager: OPERATIONS,
  administrator: ADMINISTRATION,
  superuser: ADMINISTRATION,
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
