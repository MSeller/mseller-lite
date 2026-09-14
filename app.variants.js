/**
 * The environments the app can be built against. Shared by app.config.js and
 * scripts/with-env.js so the package id a build installs as and the Firebase
 * project it talks to can never be picked from two different places.
 *
 * firebaseAndroidAppId / firebaseIosAppId are the apps registered in that project for
 * App Distribution (scripts/distribute-android.js, scripts/distribute-ios.js). They
 * are identifiers, not secrets.
 *
 * googleWebClientId / googleIosClientId are the project's OAuth clients for Google sign-in
 * (the "web" client is what Firebase verifies the ID token against). Also public identifiers.
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
    firebaseAndroidAppId: "1:1077247630111:android:1cd6826322c2465fb42e2a",
    firebaseIosAppId: "1:1077247630111:ios:acb9fb787dc65a33b42e2a",
    googleWebClientId: "1077247630111-n3cd86tfcckqk08njklo2h8s0mqm9i0j.apps.googleusercontent.com",
    googleIosClientId: "1077247630111-ohuakur1oaj0r4rjqg2a0ag4pgri6h5r.apps.googleusercontent.com",
  },
  production: {
    name: "MSeller Lite",
    packageSuffix: "",
    scheme: "msellerlite",
    envFile: ".env.prod",
    firebaseProjectId: "mobile-seller-v3",
    firebaseAndroidAppId: "1:744491375680:android:284590bf026c30af3453a5",
    firebaseIosAppId: "1:744491375680:ios:9808354e5ad788b83453a5",
    googleWebClientId: "744491375680-bs0l5670vbe3clvitvqrguhka0lffa4v.apps.googleusercontent.com",
    googleIosClientId: "744491375680-4jq49ibjdeudiq957u5n2f9svehtr791.apps.googleusercontent.com",
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

/** "123-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.123-abc", the iOS callback scheme. */
const getGoogleIosUrlScheme = (appEnv) =>
  `com.googleusercontent.apps.${APP_ENVS[appEnv].googleIosClientId.replace(".apps.googleusercontent.com", "")}`;

module.exports = {
  APP_ENVS,
  REQUIRED_ENV_VARS,
  resolveAppEnv,
  getPackageId,
  getGoogleIosUrlScheme,
};
