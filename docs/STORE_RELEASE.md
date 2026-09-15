# Store Release

How MSeller Lite gets to Google Play and the App Store. Tester builds keep going through
Firebase App Distribution (`pnpm distribute:*`, see `.github/workflows/app-distribution.yml`);
this document covers the store builds only.

| | Android | iOS |
|---|---|---|
| Package / bundle id | `app.mseller.msellerlite` | `app.mseller.msellerlite` |
| EAS profile | `production` (AAB) | `production` (App Store) |
| Build number | EAS remote, auto-incremented | EAS remote, auto-incremented |
| Signing | EAS-managed upload key + Play App Signing | EAS-managed distribution certificate |
| Backend | `mobile-seller-v3` (APP_ENV=production) | same |

## Build and submit

```bash
pnpm build:store          # both platforms, profile "production"
pnpm submit:android       # latest Android build → Play internal track, as a draft
pnpm submit:ios           # latest iOS build → App Store Connect / TestFlight
```

`version` in `app.config.js` is the user-facing version; bump it for every store release.
Build numbers are handled by EAS and never need editing.

## Store requirements the app already covers

- **Account creation and deletion.** Sign up is native (`components/auth/SignUpScreen.tsx`)
  and creates the business with the user as administrator, then runs the setup wizard
  (`components/onboarding/OnboardingScreen.tsx`), the same flow as cloud.mseller.app. An
  administrator can delete the account from Más → Eliminar cuenta, which deletes the business
  and every user in it (`deleteBusinessById`). Apple 5.1.1(v), Play account deletion policy.
- **Google sign-in (Android)**: "Continuar con Google" on the login and sign-up screens. A
  Google login with an MSeller account opens it; one without an account is offered to create a
  business (same `addPortalBusiness` call as the portal's Google registration), then the setup
  wizard. Hidden on iOS until Sign in with Apple is added (guideline 4.8); see
  `services/googleSignIn.ts`.
- **Privacy policy and terms** are linked from sign up and from the Más tab
  (`constants/legal.ts`).
- **Permission purpose strings** are specific Spanish sentences; unused prompts (microphone,
  "always" location) and legacy Android storage permissions are removed in `app.config.js`.
- **Export compliance**: `ITSAppUsesNonExemptEncryption: false`.

## One-time setup

### Accounts and where credentials live

Three Google accounts are involved and they are not interchangeable:

| What | Account | Notes |
|---|---|---|
| Google Play Console (developer `5110848621709968202`, app `4976182033406865940`) | victors1681@gmail.com | Owner. Invites users and service accounts. |
| Service account that uploads builds | `eas-submit@mobile-seller-212715.iam.gserviceaccount.com` | Google Cloud project `mobile-seller-212715` (managed from victors1681@gmail.com). Google Play Android Developer API enabled. Invited in Play Console → Users and permissions with release-to-testing permissions for MSeller Lite. |
| Firebase projects (`mobile-seller-v3`, `mseller-dev-40a08`) | asdominicana@gmail.com | Auth, functions, OAuth clients and the Android SHA-1 fingerprints for Google sign-in. Unrelated to Play uploads. |
| EAS / Expo (`victors1681/mseller-lite`) | victors1681 | Holds the Android upload keystore, the Play service account key and the App Store Connect key. |

- The service account's **JSON key is stored only on EAS** (expo.dev → mseller-lite → Credentials
  → Android → `app.mseller.msellerlite` → Google Service Account Key for Play Store Submissions).
  It is not in the repo, in CI secrets or on anyone's machine. To rotate it: create a new key on
  the service account, upload it there, then delete the old key in Cloud Console.
- If the submit fails with a permissions error, check the Play Console invite still has release
  permissions for MSeller Lite, and that the Play Android Developer API is enabled in
  `mobile-seller-212715`.
- `eas submit --non-interactive` cannot create the key; it has to be uploaded as above first.

### Google Play

App: [MSeller Lite in Play Console](https://play.google.com/console/u/1/developers/5110848621709968202/app/4976182033406865940/app-dashboard).

Release flow for every version:

```bash
pnpm build:android:prod   # or: eas build -p android --profile production
pnpm submit:android       # latest build → internal track, as a draft
```

Then in Play Console → Test and release → Internal testing, review the draft release and roll it
out. Promote to closed/open testing or production from there.

History:

| Date | Version | versionCode | Track | EAS build | Commit |
|---|---|---|---|---|---|
| 2026-09-14 | 1.0.1 | 9 | internal (draft) | `e7596603` | `054805cd` |

One-time setup (done):

1. App created in Play Console (default language Spanish, app, free).
2. Upload keystore: EAS-managed (`eas credentials -p android`). Play App Signing re-signs
   releases with Google's key.
3. Service account created and its key uploaded to EAS (see *Accounts* above).

Still to complete in Play Console before a release can roll out:

- App content:
  - Privacy policy: `https://mseller.app/privacy`
  - Delete account URL: `https://mseller.app/es/delete-account` (in-app: Más → Eliminar
    cuenta; by email: privacy@mseller.app).
  - Data safety: name, email, phone (account); precise location (delivery check-in, not
    shared); photos (product and delivery images); all encrypted in transit; deletion
    available.
  - Content rating questionnaire, target audience 18+, no ads.
  - App access: provide the reviewer demo account (see below).
- Personal developer accounts created after Nov 2023 need a closed test with 12 testers for
  14 days before production access; organization accounts do not.
- Register the Play **app signing** and **upload** key SHA-1s (Play Console → Test and release →
  App integrity) on the `mobile-seller-v3` Android app, or Google sign-in fails for Play installs.

### Google sign-in fingerprints

Google sign-in on Android only works for builds whose signing certificate's SHA-1 is registered
on the Firebase Android app (otherwise it fails with `DEVELOPER_ERROR`). Register each key on
both projects' apps (`mobile-seller-v3` → `app.mseller.msellerlite`, `mseller-dev-40a08` →
`app.mseller.msellerlite.dev`):

| Key | Where to get the SHA-1 |
|---|---|
| Debug / tester builds (`pnpm distribute:*`, `expo run:android`) | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (React Native template debug keystore) |
| EAS upload key | Play Console → App integrity → Upload key certificate, or `eas credentials -p android` |
| Play App Signing key (what users install) | Play Console → Test and release → App integrity |

```bash
firebase apps:android:sha:create <firebase-android-app-id> <sha1> --project <project>
```

The OAuth client IDs live in `app.variants.js` (`googleWebClientId`, `googleIosClientId`).

### App Store

1. Create the app record in App Store Connect for `app.mseller.msellerlite`, then set its
   numeric Apple ID as `submit.production.ios.ascAppId` in `eas.json`.
2. Create an App Store Connect API key (App Manager) and let EAS store it on the first
   `pnpm submit:ios`.
3. App Privacy: same data as Play's Data safety; none used for tracking.
4. `supportsTablet` is `true`, so iPad screenshots (13") are required and iPad is reviewed.
5. Review notes: explain that the app is the field companion of MSeller Cloud, give the demo
   account, and point at the printer/Bluetooth feature as optional hardware.

### Reviewer demo account

Both stores need a signed-in path with real data. Keep one administrator account on
production whose business has finished setup, with routes, orders, customers and products,
and a password that does not rotate. Do not delete it with the in-app flow.

## Listing assets

- Icon: 1024×1024 (`assets/icons/Icon.png`), Play feature graphic 1024×500.
- Screenshots: phone (Play), 6.9" iPhone and 13" iPad (App Store). Spanish first.
- Short description (80 chars), full description, keywords (iOS), support URL, marketing URL
  `https://mseller.app`.
