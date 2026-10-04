import { describe, expect, it } from "@jest/globals";

import { describeRouteListError } from "../routeStatus";

const httpError = (status: number, message?: string) => ({
  response: { status, data: message ? { message } : undefined },
  message: `Request failed with status code ${status}`,
});

describe("describeRouteListError", () => {
  it("reads a 403 as the module being switched off", () => {
    expect(describeRouteListError(httpError(403, "Funcionalidad de entrega no habilitada"), "x")).toEqual({
      kind: "disabled",
      message: "Funcionalidad de entrega no habilitada",
    });
  });

  it("reads a 400 as a missing driver code only when asked to", () => {
    expect(describeRouteListError(httpError(400), "x", { unassignedOn400: true }).kind).toBe("unassigned");
    expect(describeRouteListError(httpError(400), "x").kind).toBe("failed");
  });

  it("keeps anything else retryable, with the server message or the fallback", () => {
    expect(describeRouteListError(httpError(500, "boom"), "x")).toEqual({ kind: "failed", message: "boom" });
    expect(describeRouteListError({}, "fallback")).toEqual({ kind: "failed", message: "fallback" });
  });
});
