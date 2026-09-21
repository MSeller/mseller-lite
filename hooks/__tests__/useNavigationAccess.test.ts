import { describe, expect, it, jest } from "@jest/globals";

import type { UserTypes } from "../../types/user";
import { SECTIONS_BY_USER_TYPE, type NavSection } from "../useNavigationAccess";

// Only the mapping is under test; the hook's profile source (Firebase) stays out of it.
jest.mock("../../contexts/UserContext", () => ({ useUser: () => ({ userProfile: null, loading: true }) }));

type UserType = UserTypes["type"];

const CATALOG: NavSection[] = ["catalogCustomers", "catalogProducts"];

/** Roles that may load a prepared route onto the truck from Preparación. */
const LOADERS: UserType[] = ["office", "manager", "administrator", "superuser"];

/** Buying from a supplier is a purchasing decision: the roles that run the business. */
const PURCHASING: NavSection[] = ["marketplace"];
const BUYERS: UserType[] = ["office", "manager", "administrator", "superuser"];

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
  it.each<UserType>(["administrator", "superuser"])("offers both catalog sections to %s", (type) => {
    expect(SECTIONS_BY_USER_TYPE[type]).toEqual(expect.arrayContaining(CATALOG));
  });

  it.each<UserType>(["driver", "office", "manager", "seller", "inventory", "accounting"])(
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
      ...(type === "administrator" || type === "superuser" ? CATALOG : []),
      ...(LOADERS.includes(type) ? (["truckLoading"] as NavSection[]) : []),
      ...(BUYERS.includes(type) ? PURCHASING : []),
    ];
    expect([...SECTIONS_BY_USER_TYPE[type]].sort()).toEqual([...expected].sort());
  });

  it("offers inventory only picking and the Inventario modules", () => {
    expect([...SECTIONS_BY_USER_TYPE.inventory].sort()).toEqual(["picking", "products", "stockCount"]);
  });

  it.each<UserType>(["inventory", "driver", "seller", "accounting"])("does not let %s load the truck from Preparación", (type) => {
    expect(SECTIONS_BY_USER_TYPE[type]).not.toContain("truckLoading");
  });

  // The rep sells the supplier's catalogue; they do not buy from it on the shop's behalf.
  it.each<UserType>(["seller", "driver", "inventory", "accounting"])(
    "does not offer the marketplace to %s",
    (type) => {
      expect(SECTIONS_BY_USER_TYPE[type]).not.toContain("marketplace");
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
