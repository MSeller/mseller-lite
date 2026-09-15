import { describe, expect, it, jest } from "@jest/globals";

import type { UserTypes } from "../../types/user";
import { SECTIONS_BY_USER_TYPE, type NavSection } from "../useNavigationAccess";

// Only the mapping is under test; the hook's profile source (Firebase) stays out of it.
jest.mock("../../contexts/UserContext", () => ({ useUser: () => ({ userProfile: null, loading: true }) }));

type UserType = UserTypes["type"];

const CATALOG: NavSection[] = ["catalogCustomers", "catalogProducts"];

/** What every role was offered before the Catálogo tab existed. */
const PREVIOUS: Record<UserType, NavSection[]> = {
  seller: ["documents", "products"],
  driver: ["deliveries", "products"],
  inventory: ["documents", "picking", "stockCount", "products"],
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
    const expected = type === "administrator" || type === "superuser" ? [...PREVIOUS[type], ...CATALOG] : PREVIOUS[type];
    expect([...SECTIONS_BY_USER_TYPE[type]].sort()).toEqual([...expected].sort());
  });

  it("covers every user type", () => {
    expect(Object.keys(SECTIONS_BY_USER_TYPE).sort()).toEqual(Object.keys(PREVIOUS).sort());
  });
});
