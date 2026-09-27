import { describe, expect, it, jest } from "@jest/globals";

import type { UserTypes } from "../../types/user";
import { canApproveOrders, isAwaitingApproval } from "../useOrderApproval";

jest.mock("../../contexts/UserContext", () => ({ useUser: () => ({ userProfile: null, loading: true }) }));
jest.mock("../../services/permissionService", () => ({ getMyPermissions: jest.fn() }));

const profile = (type: UserTypes["type"]): UserTypes => ({ type }) as UserTypes;
const permissions = (granted: boolean, ready = true) => ({
  ready,
  has: (modulo: string, permiso: string) => granted && modulo === "pedidos" && permiso === "aprobar",
});

describe("canApproveOrders", () => {
  it("requires the pedidos.aprobar role permission", () => {
    expect(canApproveOrders(profile("administrator"), permissions(true))).toBe(true);
    expect(canApproveOrders(profile("administrator"), permissions(false))).toBe(false);
  });

  it("offers nothing until the permissions have loaded", () => {
    expect(canApproveOrders(profile("administrator"), permissions(true, false))).toBe(false);
  });

  it.each<UserTypes["type"]>(["driver", "inventory"])("never lets %s approve", (type) => {
    expect(canApproveOrders(profile(type), permissions(true))).toBe(false);
  });
});

describe("isAwaitingApproval", () => {
  it("is true only for a pending, live order", () => {
    expect(isAwaitingApproval({ tipoDocumento: "order", procesado: "pendiente", anulado: false })).toBe(true);
    expect(isAwaitingApproval({ tipoDocumento: "order", procesado: "procesado", anulado: false })).toBe(false);
    expect(isAwaitingApproval({ tipoDocumento: "order", procesado: "pendiente", anulado: true })).toBe(false);
    expect(isAwaitingApproval({ tipoDocumento: "invoice", procesado: "pendiente", anulado: false })).toBe(false);
  });
});
