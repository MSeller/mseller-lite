import Constants from "expo-constants";
import { GoogleAuthProvider, signInWithCredential, type OAuthCredential } from "firebase/auth";
import { Platform, TurboModuleRegistry } from "react-native";

import { auth } from "../config/firebase";

/**
 * Native Google sign-in, handed to Firebase as a credential.
 *
 * Android only for now. App Store guideline 4.8 requires Sign in with Apple next to any
 * third-party login on iOS, so Google stays hidden there until Apple is added; the iOS client
 * and URL scheme are already configured, so turning it on is this one check.
 */
const PLATFORM_ENABLED = Platform.OS === "android";

type GoogleSigninModule = typeof import("@react-native-google-signin/google-signin");

let cachedModule: GoogleSigninModule | null | undefined;

/**
 * The package resolves its native module the moment it is imported, which throws in a binary
 * built before it was added. Asking the registry first keeps older dev clients working.
 */
const loadModule = (): GoogleSigninModule | null => {
  if (cachedModule !== undefined) return cachedModule;
  if (!PLATFORM_ENABLED || !TurboModuleRegistry.get("RNGoogleSignin")) {
    cachedModule = null;
    return null;
  }
  const mod: GoogleSigninModule = require("@react-native-google-signin/google-signin");
  const extra = Constants.expoConfig?.extra;
  mod.GoogleSignin.configure({
    webClientId: extra?.googleWebClientId,
    iosClientId: extra?.googleIosClientId,
  });
  cachedModule = mod;
  return mod;
};

export const isGoogleSignInAvailable = (): boolean => !!loadModule();

export class GoogleSignInUnavailableError extends Error {
  constructor() {
    super("GOOGLE_SIGN_IN_UNAVAILABLE");
    this.name = "GoogleSignInUnavailableError";
  }
}

/**
 * Shows the Google account picker and returns a Firebase credential for the chosen account, or
 * null if the user backed out.
 */
export const getGoogleCredential = async (): Promise<OAuthCredential | null> => {
  const mod = loadModule();
  if (!mod) throw new GoogleSignInUnavailableError();
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = mod;

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    const idToken = response.data.idToken;
    if (!idToken) throw new Error("GOOGLE_NO_ID_TOKEN");
    return GoogleAuthProvider.credential(idToken);
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return null;
    if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new GoogleSignInUnavailableError();
    }
    throw error;
  }
};

/**
 * Signs in to Firebase with Google. Returns false if the user backed out. Whether the login has
 * an MSeller account is decided afterwards, by the profile load (see UserContext).
 */
export const signInWithGoogle = async (): Promise<boolean> => {
  const credential = await getGoogleCredential();
  if (!credential) return false;
  await signInWithCredential(auth, credential);
  return true;
};

/** Forgets the Google account on the device, so the next sign-in shows the account picker. */
export const signOutOfGoogle = async (): Promise<void> => {
  const mod = loadModule();
  if (!mod) return;
  await mod.GoogleSignin.signOut().catch(() => undefined);
};

export const isGoogleUser = (user: { providerData: { providerId: string }[] } | null): boolean =>
  !!user?.providerData.some((provider) => provider.providerId === "google.com");

export const hasPasswordLogin = (user: { providerData: { providerId: string }[] } | null): boolean =>
  !!user?.providerData.some((provider) => provider.providerId === "password");
