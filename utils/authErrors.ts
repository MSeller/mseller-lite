/**
 * Firebase Auth codes that mean "this email and password don't match". Newer SDKs answer
 * `auth/invalid-credential` or `auth/invalid-login-credentials` for both a wrong password and
 * an unknown email — on purpose, so a sign-in form cannot be used to find out who has an
 * account — so the app treats them all as one case.
 */
export const WRONG_PASSWORD_CODES = [
  "auth/wrong-password",
  "auth/invalid-credential",
  "auth/invalid-login-credentials",
  "auth/user-not-found",
];

export type SignInFailure =
  | "credentials"
  | "invalidEmail"
  | "disabled"
  | "tooManyRequests"
  | "network"
  | "unknown";

/** What went wrong with an email/password sign-in, from the Firebase error code. */
export const signInFailureOf = (code?: string): SignInFailure => {
  if (!code) return "unknown";
  if (WRONG_PASSWORD_CODES.includes(code)) return "credentials";
  switch (code) {
    case "auth/invalid-email":
    case "auth/missing-email":
      return "invalidEmail";
    case "auth/user-disabled":
      return "disabled";
    case "auth/too-many-requests":
      return "tooManyRequests";
    case "auth/network-request-failed":
      return "network";
    default:
      return "unknown";
  }
};
