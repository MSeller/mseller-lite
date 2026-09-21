import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import { auth, functions } from "../config/firebase";
import {
  buildCompleteOnboardingPayload,
  buildConfigurePayload,
  buildRegistrationPayload,
  buildSocialRegistrationPayload,
  isEmailAlreadyRegistered,
  type OnboardingForm,
  type RegistrationForm,
} from "../utils/account";
import { restClient } from "./api";
import { getGoogleCredential, signOutOfGoogle } from "./googleSignIn";

/**
 * Self-service account lifecycle, on the same backend calls the portal (cloud.mseller.app)
 * uses: `addPortalBusiness` to sign up, POST /consumo/onboarding/configure plus
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
 * Creates the business for a login that has no MSeller account yet (a Google sign-in), with the
 * user as its administrator — the portal's Google registration. The caller reloads the profile
 * afterwards, which forces a fresh token carrying the new role and business claims.
 */
export const createBusinessForSignedInUser = async (user: User): Promise<void> => {
  await httpsCallable(functions, "addPortalBusiness")(buildSocialRegistrationPayload(user));
};

/** Signs out of Firebase and forgets the Google account on the device. */
export const signOutCompletely = async (): Promise<void> => {
  await Promise.all([signOut(auth), signOutOfGoogle()]);
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
  form: OnboardingForm,
  preferredLanguage: string,
): Promise<void> => {
  // Ruta RELATIVA contra la API de Consumo, que es la única con la que habla la app.
  // Antes se construía una URL absoluta al host del Portal —era la única llamada al Portal
  // de toda la app— y eso hacía que el alta dependiera de que la configuración del negocio
  // trajera bien esa dirección. En local son dos procesos en dos puertos y el del Portal
  // solo escucha en loopback, así que desde un teléfono era inalcanzable y el registro
  // moría con un 404 que parece una caída del backend. El endpoint existe ahora también en
  // Consumo, delegando en el MISMO servicio de onboarding, así que no hay dos caminos que
  // puedan divergir.
  const { data } = await restClient.post<ConfigureResponse>(
    "/consumo/onboarding/configure",
    buildConfigurePayload(form, preferredLanguage),
    // Seeding runs in one SQL transaction and can take a while on a cold tenant.
    { timeout: 120000 },
  );
  if (!data?.success) throw new Error(data?.message || "ONBOARDING_CONFIGURE_FAILED");

  await httpsCallable(functions, "completeOnboarding")(buildCompleteOnboardingPayload(user.uid, form));
};

export class ReauthenticationCancelledError extends Error {
  constructor() {
    super("REAUTHENTICATION_CANCELLED");
    this.name = "ReauthenticationCancelledError";
  }
}

/**
 * Deletes the business and every user in it. The user proves it is really them first — with
 * the password, or by picking their Google account again when they have no password.
 */
export const deleteBusinessAccount = async (
  user: User,
  proof: { password: string } | { google: true },
  businessId: string,
): Promise<void> => {
  if ("password" in proof) {
    if (!user.email) throw new Error("NO_EMAIL");
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, proof.password));
  } else {
    const credential = await getGoogleCredential();
    if (!credential) throw new ReauthenticationCancelledError();
    await reauthenticateWithCredential(user, credential);
  }
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
