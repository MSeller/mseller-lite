import "dotenv/config";

export default {
  expo: {
    name: "MSeller Lite",
    slug: "mseller-lite",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/icons/Icon.png",
    scheme: "msellerlite",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      icon: "./assets/icons/Icon.png",
    },
    android: {
      package: "app.mseller.msellerlite",
      icon: "./assets/images/Icon-square.png",
      adaptiveIcon: {
        foregroundImage: "./assets/images/Icon-square.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      crashReporting: {
        enabled: true,
      },
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
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
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
