/**
 * The environments the app can be built against. Shared by app.config.js and
 * scripts/with-env.js so the package id a build installs as and the Firebase
 * project it talks to can never be picked from two different places.
 *
 * The Firebase project is the whole backend switch: the API base URL comes from
 * the signed-in user's business config in that project's Firestore.
 */
const APP_ENVS = {
  development: {
    name: "MSeller Lite (Dev)",
    packageSuffix: ".dev",
    scheme: "msellerlite-dev",
    envFile: ".env.dev",
    firebaseProjectId: "mseller-dev-40a08",
  },
  production: {
    name: "MSeller Lite",
    packageSuffix: "",
    scheme: "msellerlite",
    envFile: ".env.prod",
    firebaseProjectId: "mobile-seller-v3",
  },
};

const BASE_PACKAGE = "app.mseller.msellerlite";

const REQUIRED_ENV_VARS = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
];

/** Unset means production, which keeps `pnpm start` and the existing EAS profiles as they were. */
const resolveAppEnv = (raw = process.env.APP_ENV) => {
  const appEnv = raw || "production";
  if (!APP_ENVS[appEnv]) {
    throw new Error(
      `Unknown APP_ENV "${appEnv}". Use one of: ${Object.keys(APP_ENVS).join(", ")}`,
    );
  }
  return appEnv;
};

const getPackageId = (appEnv) => BASE_PACKAGE + APP_ENVS[appEnv].packageSuffix;

module.exports = {
  APP_ENVS,
  REQUIRED_ENV_VARS,
  resolveAppEnv,
  getPackageId,
};
