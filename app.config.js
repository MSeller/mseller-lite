const { APP_ENVS, resolveAppEnv, getPackageId, getGoogleIosUrlScheme } = require("./app.variants");

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

// expo-camera and expo-image-picker both write NSCameraUsageDescription; one string covers every use.
const CAMERA_USAGE =
  "MSeller Lite usa la cámara para leer códigos de barras, tomar fotos de productos y la foto de prueba de entrega.";

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
      icon: "./assets/icons/Icon.png",
      // Icon-square.png is the full-bleed icon art scaled to the 72dp a launcher shows of the
      // 108dp layer, on transparency, so Android shows the whole icon like iOS does. The
      // background matches the art's corners for launchers that reveal the edges.
      adaptiveIcon: {
        foregroundImage: "./assets/images/Icon-square.png",
        backgroundColor: "#0E2D70",
      },
      edgeToEdgeEnabled: true,
      crashReporting: {
        enabled: true,
      },
      // expo-camera's library manifest declares RECORD_AUDIO. The app only scans barcodes
      // and never records sound, so the permission is removed rather than shipped unused.
      // Legacy storage permissions come from libraries; the app picks images through the system
      // photo picker, which needs none, and Play asks apps to justify broad storage access.
      // SYSTEM_ALERT_WINDOW ("display over other apps") comes from Expo's native template and
      // React Native's debug manifest; the app never draws overlays.
      blockedPermissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.SYSTEM_ALERT_WINDOW",
      ],
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
          // Full MSeller wordmark in white on the dark theme background, whatever the system
          // theme, so launch always looks the same. LoadingScreen continues it.
          image: "./assets/images/mseller-logo-light.png",
          imageWidth: 240,
          resizeMode: "contain",
          backgroundColor: "#0E1216",
          // Android 12+ masks the splash icon to a circle; narrower keeps the wordmark whole.
          android: { imageWidth: 180 },
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "MSeller Lite usa tu ubicación para registrar la entrega de los pedidos.",
          // Location is only read while the app is open. `false` drops the "Always" purpose
          // strings, which would otherwise ship as Expo's generic English placeholder.
          locationAlwaysAndWhenInUsePermission: false,
          locationAlwaysPermission: false,
        },
      ],
      [
        "expo-image-picker",
        {
          cameraPermission: CAMERA_USAGE,
          photosPermission:
            "MSeller Lite usa tus fotos para adjuntar imágenes de productos, entregas y el logo de tu empresa.",
          microphonePermission: false,
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: CAMERA_USAGE,
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      // Native Google sign-in. The URL scheme is the iOS OAuth client's callback.
      [
        "@react-native-google-signin/google-signin",
        { iosUrlScheme: getGoogleIosUrlScheme(APP_ENV) },
      ],
      // Local module (modules/thermal-printer): Bluetooth permissions for ticket printing.
      "./modules/thermal-printer/app.plugin.js",
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
      googleWebClientId: variant.googleWebClientId,
      googleIosClientId: variant.googleIosClientId,
      eas: {
        projectId: "8e865fbc-598d-4e71-9f6f-28964c977efb",
      },
    },
  },
};
