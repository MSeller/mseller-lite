const { APP_ENVS, resolveAppEnv, getPackageId } = require("./app.variants");

// scripts/with-env.js has already loaded exactly one environment's file and set
// EXPO_NO_DOTENV. Reading .env on top of it would leak production keys into Dev.
if (!process.env.EXPO_NO_DOTENV) {
  require("dotenv").config({ quiet: true });
}

const APP_ENV = resolveAppEnv();
const variant = APP_ENVS[APP_ENV];
const PACKAGE_ID = getPackageId(APP_ENV);

const firebaseProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
if (
  process.env.APP_ENV &&
  firebaseProjectId &&
  firebaseProjectId !== variant.firebaseProjectId
) {
  throw new Error(
    `APP_ENV=${APP_ENV} must use Firebase project "${variant.firebaseProjectId}", got "${firebaseProjectId}".`,
  );
}

export default {
  expo: {
    name: variant.name,
    slug: "mseller-lite",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/icons/Icon.png",
    scheme: variant.scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      bundleIdentifier: PACKAGE_ID,
      // Signs with the MSeller team; EAS holds the certificate and ad hoc profile.
      appleTeamId: "HDYHZ227JK",
      supportsTablet: true,
      icon: "./assets/icons/Icon.png",
      infoPlist: {
        // Only standard HTTPS/TLS, which is exempt: skips the export-compliance
        // question on every build and upload.
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: PACKAGE_ID,
      // Set by scripts/distribute-android.js so every tester build upgrades the last one.
      // EAS builds ignore it (appVersionSource: remote).
      ...(process.env.ANDROID_VERSION_CODE && {
        versionCode: Number(process.env.ANDROID_VERSION_CODE),
      }),
      icon: "./assets/images/Icon-square.png",
      adaptiveIcon: {
        foregroundImage: "./assets/images/Icon-square.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      crashReporting: {
        enabled: true,
      },
      // expo-camera's library manifest declares RECORD_AUDIO. The app only scans barcodes
      // and never records sound, so the permission is removed rather than shipped unused.
      blockedPermissions: ["android.permission.RECORD_AUDIO"],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/icons/icon_20pt@2x.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/Icon-square.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "MSeller Lite usa tu ubicación para registrar la entrega de los pedidos.",
        },
      ],
      [
        "expo-image-picker",
        {
          cameraPermission:
            "MSeller Lite usa la cámara para tomar la foto de prueba de entrega.",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission:
            "MSeller Lite usa la cámara para leer códigos de barras y tomar fotos de productos.",
          recordAudioAndroid: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appEnv: APP_ENV,
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId:
        process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      firebaseDatabaseUrl: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
      firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      eas: {
        projectId: "8e865fbc-598d-4e71-9f6f-28964c977efb",
      },
    },
  },
};
