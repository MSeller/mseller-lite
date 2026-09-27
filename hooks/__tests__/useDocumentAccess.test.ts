import { describe, expect, it, jest } from "@jest/globals";

import type { UserTypes } from "../../types/user";
import { allowedDocumentTypesFor } from "../useDocumentAccess";

jest.mock("../../contexts/UserContext", () => ({ useUser: () => ({ userProfile: null, loading: true }) }));

const profile = (overrides: Partial<UserTypes> = {}): UserTypes =>
  ({ type: "seller", business: { config: {} }, ...overrides }) as unknown as UserTypes;

describe("allowedDocumentTypesFor", () => {
  it("allows every type when the user has no per-user switches (legacy profile)", () => {
    expect(allowedDocumentTypesFor(profile())).toEqual(["invoice", "order", "quote"]);
  });

  it("honours the per-user switches from the portal", () => {
    expect(
      allowedDocumentTypesFor(profile({ documentTypes: { invoice: false, order: true, quote: false } })),
    ).toEqual(["order"]);
  });

  it("drops quotes when the business has them turned off", () => {
    expect(
      allowedDocumentTypesFor(profile({ business: { config: { allowQuote: false } } as UserTypes["business"] })),
    ).toEqual(["invoice", "order"]);
  });

  it("gives a driver nothing, whatever the switches say", () => {
    expect(
      allowedDocumentTypesFor(profile({ type: "driver", documentTypes: { invoice: true, order: true, quote: true } })),
    ).toEqual([]);
  });

  it("gives nobody anything without a profile", () => {
    expect(allowedDocumentTypesFor(null)).toEqual([]);
  });
});
