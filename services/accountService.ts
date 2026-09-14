import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import { getEnvironmentConfigWithUser } from "../config/environment";
import { auth, functions } from "../config/firebase";
import type { IConfig } from "../types/user";
import {
  buildCompleteOnboardingPayload,
  buildConfigurePayload,
  buildRegistrationPayload,
  isEmailAlreadyRegistered,
  type OnboardingForm,
  type RegistrationForm,
} from "../utils/account";
import { restClient } from "./api";

/**
 * Self-service account lifecycle, on the same backend calls the portal (cloud.mseller.app)
 * uses: `addPortalBusiness` to sign up, POST /portal/onboarding/configure plus
 * `completeOnboarding` to set the business up, and `deleteBusinessById` to close it.
 */

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("EMAIL_ALREADY_REGISTERED");
    this.name = "EmailAlreadyRegisteredError";
  }
}

/**
 * Creates the business and its administrator, then signs in. Signing in is what hands the
 * app over to the setup wizard: the new business has `hasCompletedOnboarding: false`.
 *
 * If the email already has an account the password is tried against it, so someone who
 * signed up earlier but never finished setup lands back in the wizard instead of an error.
 */
export const registerBusinessAccount = async (form: RegistrationForm): Promise<void> => {
  const payload = buildRegistrationPayload(form);
  try {
    await httpsCallable(functions, "addPortalBusiness")(payload);
  } catch (error: any) {
    if (!isEmailAlreadyRegistered(error?.message)) throw error;
    try {
      await signInWithEmailAndPassword(auth, payload.user_email, payload.user_password);
      return;
    } catch {
      throw new EmailAlreadyRegisteredError();
    }
  }
  await signInWithEmailAndPassword(auth, payload.user_email, payload.user_password);
};

/**
 * The Portal API host for this business. The app's REST client points at the Consumo API,
 * so onboarding (a Portal API endpoint) is addressed by absolute URL; the client's
 * interceptors still attach and refresh the Firebase token.
 */
const getPortalBaseUrl = (config: IConfig, testMode?: boolean): string => {
  const env = getEnvironmentConfigWithUser(config);
  if (env.isLocalDevelopment && env.apiBaseURL) return env.apiBaseURL;
  return config.testMode || testMode
    ? `${config.portalSandboxUrl}:${config.portalSandboxPort}`
    : `${config.portalServerUrl}:${config.portalServerPort}`;
};

interface ConfigureResponse {
  success: boolean;
  message?: string;
}

/**
 * Seeds the business (company data, location, seller, payment types, NCF sequences and, for
 * "sample", a demo customer and product) and then marks setup finished. The order matters:
 * the flag is only flipped once the tenant is actually usable.
 */
export const completeBusinessSetup = async (
  user: User,
  config: IConfig,
  testMode: boolean | undefined,
  form: OnboardingForm,
  preferredLanguage: string,
): Promise<void> => {
  const { data } = await restClient.post<ConfigureResponse>(
    `${getPortalBaseUrl(config, testMode)}/portal/onboarding/configure`,
    buildConfigurePayload(form, preferredLanguage),
    // Seeding runs in one SQL transaction and can take a while on a cold tenant.
    { timeout: 120000 },
  );
  if (!data?.success) throw new Error(data?.message || "ONBOARDING_CONFIGURE_FAILED");

  await httpsCallable(functions, "completeOnboarding")(buildCompleteOnboardingPayload(user.uid, form));
};

/**
 * Deletes the business and every user in it. Firebase only lets a recent sign-in do this
 * kind of thing, and the user must prove it is really them, so the password is checked first.
 */
export const deleteBusinessAccount = async (
  user: User,
  password: string,
  businessId: string,
): Promise<void> => {
  if (!user.email) throw new Error("NO_EMAIL");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  await httpsCallable(functions, "deleteBusinessById")({ businessId });
};

const RNC_LOOKUP_TIMEOUT_MS = 10000;

export interface RncInfo {
  businessName: string;
  commercialName: string;
  status: string;
}

/**
 * Looks an RNC or cédula up in the DGII registry through the same service the portal's
 * /api/rnc route proxies. Returns null when it is not found or the service is unavailable;
 * the wizard lets the user continue either way.
 */
export const lookupRnc = async (digits: string): Promise<RncInfo | null> => {
  // A stalled registry must not leave the wizard saying "checking" forever.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RNC_LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://rnc.megaplus.com.do/api/consulta?rnc=${encodeURIComponent(digits)}&source=mseller`,
      // React Native's AbortSignal type differs from the DOM one fetch is typed with; same object.
      { signal: controller.signal as unknown as RequestInit["signal"] },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as Record<string, any>;
    if (body?.error || !body?.nombre_razon_social) return null;
    return {
      businessName: body.nombre_razon_social,
      commercialName: body.nombre_comercial || "",
      status: body.estado || body.estatus || "",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
