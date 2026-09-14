/**
 * Pure rules behind self-signup, the business setup wizard and account deletion. They mirror
 * the portal (mseller-cloud src/pages/register and src/pages/onboarding) so an account made in
 * the app is indistinguishable from one made on cloud.mseller.app. Kept free of React and
 * Firebase so they can be unit tested.
 */
import type { FiscalType, SetupOption } from "../constants/onboarding";
import type { UserTypes } from "../types/user";

// ── Registration ────────────────────────────────────────────────────────────

export interface RegistrationForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegistrationError =
  | "firstNameRequired"
  | "lastNameRequired"
  | "emailRequired"
  | "emailInvalid"
  | "passwordRequired"
  | "passwordTooShort"
  | "passwordNeedsUppercase"
  | "passwordNeedsNumber"
  | "passwordsDoNotMatch";

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/** The app's one email format check (sign up, catalog forms). Surrounding spaces are ignored. */
export const isValidEmail = (email: string): boolean => EMAIL_PATTERN.test(email.trim());

/** The first rule the form breaks, in field order, or null when it can be submitted. */
export const validateRegistration = (form: RegistrationForm): RegistrationError | null => {
  if (!form.firstName.trim()) return "firstNameRequired";
  if (!form.lastName.trim()) return "lastNameRequired";
  if (!form.email.trim()) return "emailRequired";
  if (!isValidEmail(form.email)) return "emailInvalid";
  if (!form.password) return "passwordRequired";
  if (form.password.length < 6) return "passwordTooShort";
  if (!/[A-Z]/.test(form.password)) return "passwordNeedsUppercase";
  if (!/[0-9]/.test(form.password)) return "passwordNeedsNumber";
  if (form.password !== form.confirmPassword) return "passwordsDoNotMatch";
  return null;
};

/** Payload of the `addPortalBusiness` callable, which creates the business and its administrator. */
export interface AddPortalBusinessRequest {
  business_name: string;
  user_email: string;
  user_password: string;
  user_first_name: string;
  user_last_name: string;
  phone: string;
  address: string;
  country: string;
  reCaptchaToken: string;
  terms: boolean;
}

export const buildRegistrationPayload = (form: RegistrationForm): AddPortalBusinessRequest => {
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  return {
    // Placeholder until the wizard asks for the real name, exactly as the portal does.
    business_name: `${firstName} ${lastName}'s Business`,
    user_email: form.email.trim(),
    user_password: form.password,
    user_first_name: firstName,
    user_last_name: lastName,
    // Collected by the setup wizard.
    phone: "",
    address: "",
    country: "",
    // The server's token for a registration made without a captcha widget.
    reCaptchaToken: "simple-registration",
    // Accepted through the notice shown above the Create Account button.
    terms: true,
  };
};

/**
 * Splits a Google display name into first and last name the way the portal's Google
 * registration does: first word, then the rest, falling back to the email prefix and "Google".
 */
export const splitDisplayName = (
  displayName: string | null | undefined,
  email: string | null | undefined,
): { firstName: string; lastName: string } => {
  const parts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length > 0) {
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") || "Google" };
  }
  return { firstName: (email ?? "").split("@")[0] || "User", lastName: "Google" };
};

/**
 * `addPortalBusiness` for a user already signed in with Google: no password, and the Firebase
 * uid so the server attaches the business to that login instead of creating a new one.
 */
export const buildSocialRegistrationPayload = (user: {
  uid: string;
  email: string | null;
  displayName: string | null;
}): AddPortalBusinessRequest & { uid: string } => {
  const { firstName, lastName } = splitDisplayName(user.displayName, user.email);
  return {
    ...buildRegistrationPayload({
      firstName,
      lastName,
      email: user.email ?? "",
      password: "",
      confirmPassword: "",
    }),
    reCaptchaToken: "google-social-login",
    uid: user.uid,
  };
};

/**
 * `getUserProfileV2` answers a login without a `users/{uid}` document with "user <id> not found
 * on users …". That is a Google login that has no MSeller account yet, not a failure.
 */
export const isProfileNotFound = (message: string | undefined): boolean =>
  !!message && /not found on users/i.test(message);

/**
 * The server rejects an existing email with "Email x already exist" (sic). Matching the stem
 * also keeps working if that message is ever corrected.
 */
export const isEmailAlreadyRegistered = (message: string | undefined): boolean =>
  !!message && /already exist|already in use/i.test(message);

// ── Setup wizard ────────────────────────────────────────────────────────────

/**
 * The wizard is for the owner of a business that self-signup just created. `=== false`
 * rather than a falsy check: businesses created before the flag existed have no field at
 * all and must not be sent back through setup. Staff of an unfinished business are not
 * stopped either; only the administrator can finish it.
 */
export const needsOnboarding = (profile: UserTypes | null | undefined): boolean =>
  !!profile && profile.type === "administrator" && profile.business?.hasCompletedOnboarding === false;

export interface OnboardingForm {
  businessName: string;
  phone: string;
  country: string;
  rnc: string;
  comercialName: string;
  fiscalType: FiscalType | null;
  street: string;
  city: string;
  businessType: string;
  industry: string;
  logo: string;
  brandColor: string;
  setupOption: SetupOption;
}

export const EMPTY_ONBOARDING_FORM: OnboardingForm = {
  businessName: "",
  phone: "",
  country: "",
  rnc: "",
  comercialName: "",
  fiscalType: null,
  street: "",
  city: "",
  businessType: "",
  industry: "",
  logo: "",
  brandColor: "",
  setupOption: "sample",
};

export const ONBOARDING_STEPS = [
  "businessName",
  "phone",
  "country",
  "address",
  "businessType",
  "branding",
  "dataSetup",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Keeps digits only, at most 10, shown as 809-000-0000. */
export const formatPhone = (input: string): string => {
  const digits = input.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

export const getRncDigits = (rnc: string): string => rnc.replace(/[-\s]/g, "");

/** A Dominican RNC (9 digits) or cédula (11 digits); dashes and spaces are separators. */
export const isRncValid = (rnc: string): boolean => {
  const digits = getRncDigits(rnc);
  return /^\d+$/.test(digits) && (digits.length === 9 || digits.length === 11);
};

export const isOnboardingStepValid = (step: OnboardingStep, form: OnboardingForm): boolean => {
  switch (step) {
    case "businessName":
      return !!form.businessName.trim();
    case "phone":
      // The portal only requires a value; seven digits rules out an obviously unfinished number.
      return form.phone.replace(/\D/g, "").length >= 7;
    case "country":
      return !!form.country && (form.country !== "DO" || isRncValid(form.rnc));
    case "address":
      return !!form.street.trim() && !!form.city.trim();
    case "businessType":
      return !!form.businessType && !!form.industry;
    case "branding":
    case "dataSetup":
      return true;
  }
};

/** Body of POST /portal/onboarding/configure (Portal API OnboardingConfigRequest). */
export const buildConfigurePayload = (form: OnboardingForm, preferredLanguage?: string) => {
  const isDominican = form.country === "DO";
  return {
    businessName: form.businessName.trim(),
    phone: form.phone,
    street: form.street.trim(),
    city: form.city.trim(),
    country: form.country,
    rnc: isDominican ? form.rnc.trim() : "",
    comercialName: (isDominican && form.comercialName) || undefined,
    // Like the portal, "none" (0) is sent as absent so the backend picks the country default.
    fiscalInformationType: (isDominican && form.fiscalType) || undefined,
    businessType: form.businessType,
    industry: form.industry,
    setupOption: form.setupOption,
    ...(form.logo ? { logo: form.logo } : {}),
    ...(form.brandColor ? { colorPrimario: form.brandColor } : {}),
    ...(preferredLanguage === "es" || preferredLanguage === "en" ? { preferredLanguage } : {}),
  };
};

/** Payload of the `completeOnboarding` callable, which flips `hasCompletedOnboarding`. */
export const buildCompleteOnboardingPayload = (userId: string, form: OnboardingForm) => {
  const configure = buildConfigurePayload(form);
  return {
    userId,
    hasCompletedOnboarding: true,
    onboardingData: {
      businessName: configure.businessName,
      phone: configure.phone,
      street: configure.street,
      city: configure.city,
      country: configure.country,
      businessType: configure.businessType,
      industry: configure.industry,
      setupOption: configure.setupOption,
      ...(configure.rnc ? { rnc: configure.rnc } : {}),
      ...(configure.comercialName ? { comercialName: configure.comercialName } : {}),
      ...(configure.fiscalInformationType ? { fiscalInformationType: configure.fiscalInformationType } : {}),
    },
  };
};

// ── Account deletion ────────────────────────────────────────────────────────

/**
 * Deleting the account removes the whole business and every user in it, which the server
 * only allows the business's administrator to do.
 */
export const canDeleteAccount = (profile: UserTypes | null | undefined): boolean =>
  !!profile && profile.type === "administrator" && !!getBusinessId(profile);

export const getBusinessId = (profile: UserTypes | null | undefined): string | undefined =>
  profile?.business?.businessId || profile?.businessId || undefined;
