import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { Platform } from "react-native";

const getDefaultEmulatorHost = (): string => {
  const configuredHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST?.trim();
  if (configuredHost) return configuredHost;

  // Try Expo host URI first, useful when running on physical devices via Expo Go.
  const expoHostUri =
    Constants.expoConfig?.hostUri ||
    (
      Constants as unknown as {
        manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
      }
    ).manifest2?.extra?.expoClient?.hostUri;
  const expoHost = expoHostUri?.split(":")[0];
  if (expoHost) return expoHost;

  // Android emulators cannot reach host localhost directly.
  if (Platform.OS === "android") return "10.0.2.2";

  return "127.0.0.1";
};

// Firebase config from environment variables
const firebaseConfig = {
  apiKey:
    Constants.expoConfig?.extra?.firebaseApiKey ||
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    Constants.expoConfig?.extra?.firebaseAuthDomain ||
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:
    Constants.expoConfig?.extra?.firebaseProjectId ||
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:
    Constants.expoConfig?.extra?.firebaseStorageBucket ||
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    Constants.expoConfig?.extra?.firebaseMessagingSenderId ||
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:
    Constants.expoConfig?.extra?.firebaseAppId ||
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  // Optional: Add these if you're using additional Firebase services
  databaseURL:
    Constants.expoConfig?.extra?.firebaseDatabaseUrl ||
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  measurementId:
    Constants.expoConfig?.extra?.firebaseMeasurementId ||
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate required Firebase configuration
const requiredKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const missingKeys = requiredKeys.filter(
  (key) => !firebaseConfig[key as keyof typeof firebaseConfig],
);

if (missingKeys.length > 0) {
  console.error("🚨 Missing Firebase configuration keys:", missingKeys);
  console.error(
    "📝 Please check your environment variables and ensure all required Firebase configuration values are set.",
  );
  console.error(
    "📖 See ENVIRONMENT_VARIABLES_SETUP.md for the required format.",
  );

  // Enhanced debugging for production
  if (!__DEV__) {
    console.log("🚨 PRODUCTION: Firebase Config Debug:", {
      missingKeys,
      hasConstants: !!Constants.expoConfig?.extra,
      configKeys: Object.keys(firebaseConfig),
      timestamp: new Date().toISOString(),
    });
  }
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * getAuth() on React Native keeps the session in memory only, so every cold start signed the
 * user out. initializeAuth with AsyncStorage persistence stores it on the device and Firebase
 * restores it on launch. initializeAuth may run once per app; a fast refresh reuses the instance.
 */
const createAuth = (): Auth => {
  // The web SDK already persists the session in IndexedDB.
  if (Platform.OS === "web") return getAuth(app);
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
};

// Initialize Firebase services
const auth = createAuth();
const functions = getFunctions(app, "us-east1");
const db = getFirestore(app);
const storage = getStorage(app);

const isEmulatorEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.EXPO_PUBLIC_EMULATOR_ENABLED === "true";

const authEmulatorPort = Number(
  process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || "9099",
);
const functionsEmulatorPort = Number(
  process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT || "9999",
);
const firestoreEmulatorPort = Number(
  process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT || "8080",
);
const storageEmulatorPort = Number(
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT || "9199",
);

if (isEmulatorEnabled) {
  try {
    const emulatorHost = getDefaultEmulatorHost();
    const globalWithEmulatorState = globalThis as typeof globalThis & {
      __firebaseEmulatorsConnected?: boolean;
    };

    if (globalWithEmulatorState.__firebaseEmulatorsConnected) {
      console.log("Firebase emulators already connected");
    } else {
      console.log("Initializing Firebase emulators...", {
        host: emulatorHost,
        platform: Platform.OS,
        authPort: authEmulatorPort,
        functionsPort: functionsEmulatorPort,
        firestorePort: firestoreEmulatorPort,
        storagePort: storageEmulatorPort,
      });
      connectAuthEmulator(auth, `http://${emulatorHost}:${authEmulatorPort}`);
      connectFunctionsEmulator(functions, emulatorHost, functionsEmulatorPort);
      connectFirestoreEmulator(db, emulatorHost, firestoreEmulatorPort);
      connectStorageEmulator(storage, emulatorHost, storageEmulatorPort);
      globalWithEmulatorState.__firebaseEmulatorsConnected = true;

      console.log("Firebase emulators connected", {
        host: emulatorHost,
        auth: authEmulatorPort,
        functions: functionsEmulatorPort,
        firestore: firestoreEmulatorPort,
        storage: storageEmulatorPort,
      });
    }
  } catch (error) {
    console.error("Firebase emulator initialization error:", {
      error,
      configuredHost: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST,
      platform: Platform.OS,
    });
  }
}

export { auth, db, firebaseConfig, functions, storage };
export default app;
