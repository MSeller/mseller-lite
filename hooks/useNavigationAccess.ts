import { useMemo } from "react";
import { useUser } from "../contexts/UserContext";
import type { UserTypes } from "../types/user";

/** A module the app can offer in its navigation. */
export type NavSection =
  | "documents"
  | "picking"
  /** Loading a prepared route onto the truck. Drivers and the office; not inventory pickers. */
  | "truckLoading"
  | "deliveries"
  | "stockCount"
  | "products"
  /** Catálogo › Clientes: browse and edit the customer master. Administrators and office. */
  | "catalogCustomers"
  /** Catálogo › Productos: browse and edit the product master. Administrators and office. */
  | "catalogProducts"
  /**
   * Marketplace B2B: browse supplier stores and send them purchase requests. Offered to
   * the roles that buy for the business — a driver or a picker never places the order.
   */
  | "marketplace";

/**
 * A bottom tab between Inicio and Más. `routes` groups Preparación / Entregas, `stock`
 * groups Conteo / Productos, `loading` is the driver's list of routes ready to load.
 */
export type TabName = "documents" | "routes" | "stock" | "catalog" | "marketplace" | "loading";

/** A module offered as a row under Más instead of as a tab. */
export type MoreEntry = "routes" | "stock" | "catalog";

type UserType = UserTypes["type"];

/** Every operational module — what a manager sees. */
const OPERATIONS: NavSection[] = ["documents", "picking", "truckLoading", "deliveries", "stockCount", "products"];

/**
 * Buying from a supplier commits the shop's money, so it is offered only to office,
 * administrator and superuser — not to manager, who runs operations but does not hold
 * the purchasing decision.
 */
const PURCHASING: NavSection[] = ["marketplace"];

/**
 * Editing master data (customers, products) is an office job: the Consumo API allows
 * administrators, superusers and office on the catálogo endpoints and answers 403 to
 * everyone else, so no other role is offered Catálogo.
 */
const CATALOG: NavSection[] = ["catalogCustomers", "catalogProducts"];

const ADMINISTRATION: NavSection[] = [...OPERATIONS, ...PURCHASING, ...CATALOG];

/**
 * Which modules each user type is offered. This only shapes the menu — the Consumo
 * API is still what enforces access — so a user is never shown a module that would
 * answer 403, and never has to scroll past ones that are not part of their job.
 */
export const SECTIONS_BY_USER_TYPE: Readonly<Record<UserType, readonly NavSection[]>> = {
  seller: ["documents", "products"],
  // The driver loads the truck and delivers; products stay reachable from Inicio.
  driver: ["truckLoading", "deliveries", "products"],
  // Pickers work Rutas (preparación only — the driver loads the truck) and Inventario.
  inventory: ["picking", "stockCount", "products"],
  // Office runs documents, routes and the catalogue and buys from suppliers; it does not
  // count stock, which is warehouse work.
  office: ["documents", "picking", "truckLoading", "deliveries", "products", ...PURCHASING, ...CATALOG],
  accounting: ["documents", "products"],
  // Every operational module, but NOT the marketplace: purchasing is not theirs.
  manager: OPERATIONS,
  administrator: ADMINISTRATION,
  superuser: ADMINISTRATION,
};

/**
 * The tabs each role gets between Inicio and Más, in order. Five tabs at most so the
 * labels stay readable; whatever a role uses less often goes under Más
 * (`MORE_ENTRIES_BY_USER_TYPE`) rather than being hidden.
 */
export const TABS_BY_USER_TYPE: Readonly<Record<UserType, readonly TabName[]>> = {
  seller: ["documents"],
  driver: ["loading", "routes"],
  inventory: ["routes", "stock"],
  office: ["documents", "catalog", "marketplace"],
  accounting: ["documents"],
  manager: ["documents", "routes", "stock"],
  administrator: ["documents", "catalog", "marketplace"],
  superuser: ["documents", "catalog", "marketplace"],
};

/** Modules a role reaches from Más because they did not earn a tab. */
export const MORE_ENTRIES_BY_USER_TYPE: Readonly<Record<UserType, readonly MoreEntry[]>> = {
  seller: ["stock"],
  driver: [],
  inventory: [],
  office: ["routes", "stock"],
  accounting: ["stock"],
  manager: [],
  administrator: ["routes", "stock"],
  superuser: ["routes", "stock"],
};

/** The most tabs any role gets, Inicio and Más included. */
export const MAX_TABS = 5;

export interface NavigationAccess {
  /** True while the profile is still loading — nothing is offered yet. */
  loading: boolean;
  can: (section: NavSection) => boolean;
  /** The tabs between Inicio and Más for this user, in order. Empty while loading. */
  tabs: readonly TabName[];
  /** Modules offered as rows under Más. Empty while loading. */
  moreEntries: readonly MoreEntry[];
  /** Whether a module has its own tab (as opposed to living under Más). */
  isTab: (tab: TabName) => boolean;
}

export const useNavigationAccess = (): NavigationAccess => {
  const { userProfile, loading } = useUser();

  return useMemo(() => {
    // While loading, or for a type this app does not know, offer nothing beyond
    // Home and More: a tab that appears and is then pulled away is worse than one
    // that shows up a moment later.
    const type = !loading && userProfile ? userProfile.type : undefined;
    const allowed = new Set<NavSection>(type ? SECTIONS_BY_USER_TYPE[type] ?? [] : []);
    const tabs = type ? TABS_BY_USER_TYPE[type] ?? [] : [];
    const moreEntries = type ? MORE_ENTRIES_BY_USER_TYPE[type] ?? [] : [];
    return {
      loading,
      can: (section: NavSection) => allowed.has(section),
      tabs,
      moreEntries,
      isTab: (tab: TabName) => tabs.includes(tab),
    };
  }, [userProfile, loading]);
};
