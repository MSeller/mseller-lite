/**
 * Environment configuration utility
 * Handles local development vs production API configuration
 */

import { IConfig } from "../types/user";

export interface EnvironmentConfig {
  isLocalDevelopment: boolean;
  apiBaseURL?: string;
  mode: "local" | "production";
}

const DEFAULT_LOCAL_API_URL = "http://192.168.1.187:7173";

const isEmulatorEnabled = (): boolean =>
  process.env.NODE_ENV === "development" &&
  process.env.EXPO_PUBLIC_EMULATOR_ENABLED === "true";

/**
 * Points a localhost URL at the emulator host, so a device can reach services running on the
 * developer machine (its own 127.0.0.1 is the phone). Leaves every other URL untouched, which
 * makes it a no-op for production URLs.
 */
export const replaceLocalhostWithEmulatorHost = (rawUrl: string): string => {
  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST?.trim();
  if (!emulatorHost) return rawUrl;

  try {
    const parsedUrl = new URL(rawUrl);
    if (
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1"
    ) {
      parsedUrl.hostname = emulatorHost;
      return parsedUrl.toString().replace(/\/$/, "");
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
};

const getLocalApiBaseUrl = (): string => {
  const rawLocalApiUrl =
    process.env.TARGET ||
    process.env.EXPO_PUBLIC_TARGET ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    DEFAULT_LOCAL_API_URL;

  const configuredLocalPort =
    process.env.EXPO_PUBLIC_LOCAL_API_PORT || process.env.LOCAL_API_PORT;

  if (isEmulatorEnabled() && configuredLocalPort) {
    const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST?.trim();
    if (emulatorHost) {
      try {
        const parsedUrl = new URL(rawLocalApiUrl);
        const protocol = parsedUrl.protocol || "http:";
        return `${protocol}//${emulatorHost}:${configuredLocalPort}`;
      } catch {
        return `http://${emulatorHost}:${configuredLocalPort}`;
      }
    }
  }

  return isEmulatorEnabled()
    ? replaceLocalhostWithEmulatorHost(rawLocalApiUrl)
    : rawLocalApiUrl;
};

// Check if we're running in local development mode
const checkLocalDevelopment = (): boolean => {
  // For React Native/Expo, we can check environment variables
  // The --local flag would be passed as an environment variable
  return (
    process.env.EXPO_PUBLIC_LOCAL_MODE === "true" ||
    (process.env.NODE_ENV === "development" &&
      process.env.EXPO_PUBLIC_USE_LOCAL_API === "true")
  );
};

// Get environment configuration
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const isLocalDevelopment = checkLocalDevelopment();

  return {
    isLocalDevelopment,
    apiBaseURL: isLocalDevelopment ? getLocalApiBaseUrl() : undefined,
    mode: isLocalDevelopment ? "local" : "production",
  };
};

// Get environment configuration with user business config
export const getEnvironmentConfigWithUser = (
  userConfig?: IConfig,
): EnvironmentConfig => {
  const isLocalDevelopment = checkLocalDevelopment();

  if (isLocalDevelopment) {
    return {
      isLocalDevelopment: true,
      apiBaseURL: getLocalApiBaseUrl(),
      mode: "local",
    };
  }

  // In production mode, use user's business config if available
  const apiBaseURL =
    userConfig?.serverUrl && userConfig?.serverPort
      ? `${userConfig.serverUrl}:${userConfig.serverPort}`
      : undefined;

  return {
    isLocalDevelopment: false,
    apiBaseURL,
    mode: "production",
  };
};

// Log current environment configuration
export const logEnvironmentConfig = (userConfig?: IConfig) => {
  const config = userConfig
    ? getEnvironmentConfigWithUser(userConfig)
    : getEnvironmentConfig();
  console.log("📱 Environment Configuration:", {
    mode: config.mode,
    isLocalDevelopment: config.isLocalDevelopment,
    apiBaseURL: config.apiBaseURL || "No baseURL set",
    nodeEnv: process.env.NODE_ENV,
    localMode: process.env.EXPO_PUBLIC_LOCAL_MODE,
    useLocalAPI: process.env.EXPO_PUBLIC_USE_LOCAL_API,
    emulatorEnabled: process.env.EXPO_PUBLIC_EMULATOR_ENABLED,
    firebaseEmulatorHost: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST,
    localApiPort:
      process.env.EXPO_PUBLIC_LOCAL_API_PORT || process.env.LOCAL_API_PORT,
    localApiTarget:
      process.env.TARGET ||
      process.env.EXPO_PUBLIC_TARGET ||
      process.env.EXPO_PUBLIC_API_BASE_URL,
  });
};
