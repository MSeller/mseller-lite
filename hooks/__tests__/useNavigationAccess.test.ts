import { describe, expect, it, jest } from "@jest/globals";

import type { UserTypes } from "../../types/user";
import {
  MAX_TABS,
  MORE_ENTRIES_BY_USER_TYPE,
  SECTIONS_BY_USER_TYPE,
  TABS_BY_USER_TYPE,
  type NavSection,
} from "../useNavigationAccess";

// Only the mapping is under test; the hook's profile source (Firebase) stays out of it.
jest.mock("../../contexts/UserContext", () => ({ useUser: () => ({ userProfile: null, loading: true }) }));

type UserType = UserTypes["type"];

const CATALOG: NavSection[] = ["catalogCustomers", "catalogProducts"];

/** Roles that may load a prepared route onto the truck: the driver, and the office roles. */
const LOADERS: UserType[] = ["driver", "office", "manager", "administrator", "superuser"];

/** Roles the Consumo API lets edit master data (Catálogo). */
const CATALOG_EDITORS: UserType[] = ["office", "administrator", "superuser"];

/** Buying from a supplier commits the shop's money: office, administrator, superuser. */
const PURCHASING: NavSection[] = ["marketplace"];
const BUYERS: UserType[] = ["office", "administrator", "superuser"];

/**
 * What every role was offered before the Catálogo tab existed — except inventory, which
 * has since lost Documentos: pickers only work Rutas (preparación) and Inventario.
 */
const PREVIOUS: Record<UserType, NavSection[]> = {
  seller: ["documents", "products"],
  driver: ["deliveries", "products"],
  inventory: ["picking", "stockCount", "products"],
  office: ["documents", "picking", "deliveries", "products"],
  accounting: ["documents", "products"],
  manager: ["documents", "picking", "deliveries", "stockCount", "products"],
  administrator: ["documents", "picking", "deliveries", "stockCount", "products"],
  superuser: ["documents", "picking", "deliveries", "stockCount", "products"],
};

describe("SECTIONS_BY_USER_TYPE", () => {
  it.each<UserType>(CATALOG_EDITORS)("offers both catalog sections to %s", (type) => {
    expect(SECTIONS_BY_USER_TYPE[type]).toEqual(expect.arrayContaining(CATALOG));
  });

  it.each<UserType>(["driver", "manager", "seller", "inventory", "accounting"])(
    "does not offer the catalog to %s",
    (type) => {
      for (const section of CATALOG) {
        expect(SECTIONS_BY_USER_TYPE[type]).not.toContain(section);
      }
    }
  );

  it.each(Object.keys(PREVIOUS) as UserType[])("keeps every section %s had before", (type) => {
    const expected = [
      ...PREVIOUS[type],
      ...(CATALOG_EDITORS.includes(type) ? CATALOG : []),
      ...(LOADERS.includes(type) ? (["truckLoading"] as NavSection[]) : []),
      ...(BUYERS.includes(type) ? PURCHASING : []),
    ];
    expect([...SECTIONS_BY_USER_TYPE[type]].sort()).toEqual([...expected].sort());
  });

  it("offers inventory only picking and the Inventario modules", () => {
    expect([...SECTIONS_BY_USER_TYPE.inventory].sort()).toEqual(["picking", "products", "stockCount"]);
  });

  it.each<UserType>(["inventory", "seller", "accounting"])("does not let %s load the truck", (type) => {
    expect(SECTIONS_BY_USER_TYPE[type]).not.toContain("truckLoading");
  });

  it("lets the driver load the truck", () => {
    expect(SECTIONS_BY_USER_TYPE.driver).toContain("truckLoading");
  });

  // The rep sells the supplier's catalogue; they do not buy from it on the shop's behalf.
  // Manager is in this list on purpose: they run every operational module, so it is the
  // one role whose exclusion a later refactor could undo without anything else failing.
  it.each<UserType>(["seller", "driver", "inventory", "accounting", "manager"])(
    "does not offer the marketplace to %s",
    (type) => {
      expect(SECTIONS_BY_USER_TYPE[type]).not.toContain("marketplace");
    }
  );

  it.each<UserType>(["office", "administrator", "superuser"])(
    "offers the marketplace to %s",
    (type) => {
      expect(SECTIONS_BY_USER_TYPE[type]).toContain("marketplace");
    }
  );

  it("does not offer inventory Entregas, where routes are loaded and delivered", () => {
    expect(SECTIONS_BY_USER_TYPE.inventory).not.toContain("deliveries");
  });

  it("offers the driver deliveries but not picking", () => {
    expect(SECTIONS_BY_USER_TYPE.driver).toContain("deliveries");
    expect(SECTIONS_BY_USER_TYPE.driver).not.toContain("picking");
  });

  it("covers every user type", () => {
    expect(Object.keys(SECTIONS_BY_USER_TYPE).sort()).toEqual(Object.keys(PREVIOUS).sort());
  });
});

describe("TABS_BY_USER_TYPE", () => {
  const types = Object.keys(SECTIONS_BY_USER_TYPE) as UserType[];

  it.each(types)("gives %s at most five tabs including Inicio and Más", (type) => {
    expect(TABS_BY_USER_TYPE[type].length + 2).toBeLessThanOrEqual(MAX_TABS);
  });

  it("orders the admin bar as Documentos, Catálogo, Marketplace and keeps Rutas and Inventario under Más", () => {
    for (const type of ["administrator", "superuser", "office"] as UserType[]) {
      expect(TABS_BY_USER_TYPE[type]).toEqual(["documents", "catalog", "marketplace"]);
      expect(MORE_ENTRIES_BY_USER_TYPE[type]).toEqual(["routes", "stock"]);
    }
  });

  it("gives the driver Carga and Entregas only", () => {
    expect(TABS_BY_USER_TYPE.driver).toEqual(["loading", "routes"]);
    expect(MORE_ENTRIES_BY_USER_TYPE.driver).toEqual([]);
  });

  it("gives the warehouse Preparación and Inventario", () => {
    expect(TABS_BY_USER_TYPE.inventory).toEqual(["routes", "stock"]);
  });

  it("gives the seller Documentos, with Productos under Más", () => {
    expect(TABS_BY_USER_TYPE.seller).toEqual(["documents"]);
    expect(MORE_ENTRIES_BY_USER_TYPE.seller).toEqual(["stock"]);
  });

  it.each(types)("never offers %s a tab whose sections it does not have", (type) => {
    const sections = SECTIONS_BY_USER_TYPE[type];
    const needs: Record<string, NavSection[]> = {
      documents: ["documents"],
      loading: ["truckLoading"],
      routes: ["picking", "deliveries"],
      stock: ["stockCount", "products"],
      catalog: ["catalogCustomers", "catalogProducts"],
      marketplace: ["marketplace"],
    };
    for (const tab of [...TABS_BY_USER_TYPE[type], ...MORE_ENTRIES_BY_USER_TYPE[type]]) {
      expect(needs[tab].some((section) => sections.includes(section))).toBe(true);
    }
  });

  it.each(types)("never lists a module for %s both as a tab and under Más", (type) => {
    for (const entry of MORE_ENTRIES_BY_USER_TYPE[type]) {
      expect(TABS_BY_USER_TYPE[type]).not.toContain(entry);
    }
  });
});
