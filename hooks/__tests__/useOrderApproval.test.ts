import { describe, expect, it, jest } from "@jest/globals";

import type { UserTypes } from "../../types/user";
import { canApproveOrders, isAwaitingApproval } from "../useOrderApproval";

jest.mock("../../contexts/UserContext", () => ({ useUser: () => ({ userProfile: null, loading: true }) }));

const approver = (type: UserTypes["type"], allowApprove = true): UserTypes =>
  ({ type, cloudAccess: { orders: { enabled: true, allowApprove } } }) as unknown as UserTypes;

describe("canApproveOrders", () => {
  it("requires the portal's allowApprove flag", () => {
    expect(canApproveOrders(approver("administrator"))).toBe(true);
    expect(canApproveOrders(approver("administrator", false))).toBe(false);
    expect(canApproveOrders({ type: "administrator" } as UserTypes)).toBe(false);
  });

  it.each<UserTypes["type"]>(["driver", "inventory"])("never lets %s approve", (type) => {
    expect(canApproveOrders(approver(type))).toBe(false);
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
