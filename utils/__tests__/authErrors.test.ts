import { describe, expect, it } from "@jest/globals";

import { signInFailureOf } from "../authErrors";

describe("signInFailureOf", () => {
  it.each([
    "auth/wrong-password",
    "auth/invalid-credential",
    "auth/invalid-login-credentials",
    "auth/user-not-found",
  ])("reads %s as a wrong email or password", (code) => {
    expect(signInFailureOf(code)).toBe("credentials");
  });

  it("maps the codes that need their own message", () => {
    expect(signInFailureOf("auth/invalid-email")).toBe("invalidEmail");
    expect(signInFailureOf("auth/user-disabled")).toBe("disabled");
    expect(signInFailureOf("auth/too-many-requests")).toBe("tooManyRequests");
    expect(signInFailureOf("auth/network-request-failed")).toBe("network");
  });

  it("falls back to unknown", () => {
    expect(signInFailureOf("auth/something-new")).toBe("unknown");
    expect(signInFailureOf(undefined)).toBe("unknown");
  });
});
