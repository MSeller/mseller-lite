# Registration Parity with mseller-cloud

The app's sign up, business setup wizard and account deletion are a native copy of
cloud.mseller.app (mseller-cloud). Both create businesses through the same backend calls, so
**they must stay aligned**: any change to the portal's registration or onboarding is mirrored
here, and any change here that affects what gets stored is made in the portal first.

Native rather than an embedded web page because App Review rejects apps whose account creation
is web UI inside the app.

## Backend contract (shared)

| Step | Call | Payload built in |
|---|---|---|
| Email sign up | callable `addPortalBusiness` | `utils/account.ts` `buildRegistrationPayload` |
| Google sign up | callable `addPortalBusiness` (`uid`, `google-social-login`) | `utils/account.ts` `buildSocialRegistrationPayload` |
| Seed the tenant | `POST {portal}/portal/onboarding/configure` | `utils/account.ts` `buildConfigurePayload` |
| Finish setup | callable `completeOnboarding` | `utils/account.ts` `buildCompleteOnboardingPayload` |
| Setup pending? | `business.hasCompletedOnboarding === false` | `utils/account.ts` `needsOnboarding` |
| Delete account | callable `deleteBusinessById` | `services/accountService.ts` |

Server side: `mseller-firebase/functions/src/business/business.ts` and the Portal API's
`OnboardingController` (`mseller-api`). Payload shapes are pinned by
`utils/__tests__/account.test.ts`; update those tests together with the portal change.

## File map

| mseller-cloud | mseller-lite |
|---|---|
| `src/pages/register/index.tsx` (fields, password rules, payload, Google) | `components/auth/SignUpScreen.tsx`, `components/auth/GoogleSignInButton.tsx`, `utils/account.ts` |
| `src/pages/onboarding/index.tsx` (step order, gating, submit) | `components/onboarding/OnboardingScreen.tsx`, `utils/account.ts` |
| `src/views/onboarding/*Step.tsx` | `renderStep` in `OnboardingScreen.tsx` |
| `src/views/onboarding/BusinessTypeStep.tsx` option lists | `constants/onboarding.ts` `BUSINESS_TYPES`, `INDUSTRIES` |
| `src/utils/countryList.ts` | `constants/onboarding.ts` `COUNTRIES` |
| `src/utils/rnc.ts`, `src/pages/api/rnc/[rnc].ts` | `utils/account.ts` `isRncValid`, `services/accountService.ts` `lookupRnc` |
| `src/components/BrandColorPicker.tsx` presets | `constants/onboarding.ts` `BRAND_COLORS` |
| `src/translations/{es,en}/onboarding.json` | `locales/{es,en}.json` → `onboarding.*` |

## Deliberate differences

- Phone step requires at least 7 digits (portal: any value) so an obviously unfinished number
  cannot be saved. Formatting and the 10-digit cap match the portal.
- The data setup step offers "sample" and "new"; the portal shows "new" only behind
  `?enableAdvanced=true`. Both are values the backend already supports.
- Google sign-in asks before creating a business for a login with no account, and is Android
  only until Sign in with Apple is added (App Store guideline 4.8).
- Web-only portal pieces are not ported: Vercel BotID, referral codes from the URL, Meta /
  analytics registration events.

## When the portal changes

1. Diff the files above in mseller-cloud since the last sync.
2. Apply the change here, update `utils/__tests__/account.test.ts`, and note it in the PR.
3. Last synced with mseller-cloud `acd92767` (2026-09-14).
