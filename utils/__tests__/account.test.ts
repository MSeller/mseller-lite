import { describe, expect, it } from "@jest/globals";

import type { UserTypes } from "../../types/user";
import {
  buildCompleteOnboardingPayload,
  buildConfigurePayload,
  buildRegistrationPayload,
  canDeleteAccount,
  EMPTY_ONBOARDING_FORM,
  formatPhone,
  isEmailAlreadyRegistered,
  isOnboardingStepValid,
  isRncValid,
  needsOnboarding,
  validateRegistration,
  type OnboardingForm,
  type RegistrationForm,
} from "../account";

const validForm: RegistrationForm = {
  firstName: " Ana ",
  lastName: "Pérez",
  email: " ana@tienda.do ",
  password: "Secreta1",
  confirmPassword: "Secreta1",
};

const profile = ({ business, ...rest }: Partial<Omit<UserTypes, "business">> & { business?: object } = {}) =>
  ({ type: "administrator", ...rest, business: { businessId: "b1", ...business } }) as UserTypes;

describe("validateRegistration", () => {
  it("accepts a complete form", () => {
    expect(validateRegistration(validForm)).toBeNull();
  });

  it.each([
    [{ firstName: "  " }, "firstNameRequired"],
    [{ lastName: "" }, "lastNameRequired"],
    [{ email: "" }, "emailRequired"],
    [{ email: "ana@tienda" }, "emailInvalid"],
    [{ password: "", confirmPassword: "" }, "passwordRequired"],
    [{ password: "Ab1", confirmPassword: "Ab1" }, "passwordTooShort"],
    [{ password: "secreta1", confirmPassword: "secreta1" }, "passwordNeedsUppercase"],
    [{ password: "Secretaa", confirmPassword: "Secretaa" }, "passwordNeedsNumber"],
    [{ confirmPassword: "Secreta2" }, "passwordsDoNotMatch"],
  ])("rejects %j with %s", (patch, expected) => {
    expect(validateRegistration({ ...validForm, ...patch })).toBe(expected);
  });
});

describe("buildRegistrationPayload", () => {
  it("matches the portal's addPortalBusiness payload", () => {
    expect(buildRegistrationPayload(validForm)).toEqual({
      business_name: "Ana Pérez's Business",
      user_email: "ana@tienda.do",
      user_password: "Secreta1",
      user_first_name: "Ana",
      user_last_name: "Pérez",
      phone: "",
      address: "",
      country: "",
      reCaptchaToken: "simple-registration",
      terms: true,
    });
  });
});

describe("isEmailAlreadyRegistered", () => {
  it("recognises the server's message and its corrected spelling", () => {
    expect(isEmailAlreadyRegistered("Email ana@tienda.do already exist")).toBe(true);
    expect(isEmailAlreadyRegistered("The email address is already in use")).toBe(true);
    expect(isEmailAlreadyRegistered("internal")).toBe(false);
    expect(isEmailAlreadyRegistered(undefined)).toBe(false);
  });
});

describe("needsOnboarding", () => {
  it("sends only the administrator of an unfinished business to the wizard", () => {
    expect(needsOnboarding(profile({ business: { hasCompletedOnboarding: false } }))).toBe(true);
    expect(needsOnboarding(profile({ type: "seller", business: { hasCompletedOnboarding: false } }))).toBe(false);
    expect(needsOnboarding(profile({ business: { hasCompletedOnboarding: true } }))).toBe(false);
  });

  it("leaves businesses that predate the flag alone", () => {
    expect(needsOnboarding(profile({}))).toBe(false);
    expect(needsOnboarding(null)).toBe(false);
  });
});

describe("canDeleteAccount", () => {
  it("is limited to administrators with a business", () => {
    expect(canDeleteAccount(profile({}))).toBe(true);
    expect(canDeleteAccount(profile({ type: "superuser" }))).toBe(false);
    expect(canDeleteAccount(profile({ type: "seller" }))).toBe(false);
    expect(canDeleteAccount({ type: "administrator", business: {} } as UserTypes)).toBe(false);
    expect(canDeleteAccount({ type: "administrator", businessId: "b2", business: {} } as UserTypes)).toBe(true);
  });
});

describe("formatPhone", () => {
  it("formats as the user types and caps at ten digits", () => {
    expect(formatPhone("809")).toBe("809");
    expect(formatPhone("80955")).toBe("809-55");
    expect(formatPhone("(809) 555-12345678")).toBe("809-555-1234");
  });
});

describe("isRncValid", () => {
  it("accepts RNC and cédula lengths with separators", () => {
    expect(isRncValid("101-01063-2")).toBe(true);
    expect(isRncValid("001 1234567 8")).toBe(true);
    expect(isRncValid("1010106")).toBe(false);
    expect(isRncValid("10101063A")).toBe(false);
  });
});

describe("onboarding steps", () => {
  const filled: OnboardingForm = {
    ...EMPTY_ONBOARDING_FORM,
    businessName: "Colmado Ana",
    phone: "809-555-1234",
    country: "DO",
    rnc: "101010632",
    comercialName: "COLMADO ANA",
    fiscalType: 1,
    street: "Calle 1",
    city: "Santo Domingo",
    businessType: "Supermercado",
    industry: "Alimentos y Bebidas",
  };

  it("requires an RNC only for the Dominican Republic", () => {
    expect(isOnboardingStepValid("country", { ...filled, rnc: "" })).toBe(false);
    expect(isOnboardingStepValid("country", { ...filled, country: "US", rnc: "" })).toBe(true);
  });

  it("lets branding and data setup through untouched", () => {
    expect(isOnboardingStepValid("branding", EMPTY_ONBOARDING_FORM)).toBe(true);
    expect(isOnboardingStepValid("dataSetup", EMPTY_ONBOARDING_FORM)).toBe(true);
  });

  it("builds the configure body the Portal API expects", () => {
    expect(buildConfigurePayload({ ...filled, brandColor: "#0052ff" }, "es")).toEqual({
      businessName: "Colmado Ana",
      phone: "809-555-1234",
      street: "Calle 1",
      city: "Santo Domingo",
      country: "DO",
      rnc: "101010632",
      comercialName: "COLMADO ANA",
      fiscalInformationType: 1,
      businessType: "Supermercado",
      industry: "Alimentos y Bebidas",
      setupOption: "sample",
      colorPrimario: "#0052ff",
      preferredLanguage: "es",
    });
  });

  it("drops Dominican-only fields when another country is chosen", () => {
    const body = buildConfigurePayload({ ...filled, country: "US" });
    expect(body.rnc).toBe("");
    expect(body.comercialName).toBeUndefined();
    expect(body.fiscalInformationType).toBeUndefined();
  });

  it("builds the completeOnboarding payload", () => {
    expect(buildCompleteOnboardingPayload("u1", { ...filled, fiscalType: 0 })).toEqual({
      userId: "u1",
      hasCompletedOnboarding: true,
      onboardingData: {
        businessName: "Colmado Ana",
        phone: "809-555-1234",
        street: "Calle 1",
        city: "Santo Domingo",
        country: "DO",
        businessType: "Supermercado",
        industry: "Alimentos y Bebidas",
        setupOption: "sample",
        rnc: "101010632",
        comercialName: "COLMADO ANA",
      },
    });
  });
});
