# Testing on a real Android device

The app builds against one of two environments. They install side by side, so a
phone can carry both.

| | Dev | Prod |
|---|---|---|
| App name | MSeller Lite (Dev) | MSeller Lite |
| Package id | `app.mseller.msellerlite.dev` | `app.mseller.msellerlite` |
| Deep-link scheme | `msellerlite-dev://` | `msellerlite://` |
| Firebase project | `mseller-dev-40a08` | `mobile-seller-v3` |
| Env file (local builds) | `.env.dev` | `.env.prod` |
| EAS environment | `development` | `production` |
| In-app marker | orange **DEV** tag, top-right | none |

The Firebase project is the whole backend switch. Once signed in, the API base URL
comes from the user's business config in that project's Firestore, so a Dev build
talks to the Dev API (`portal.api.mseller.dev`) without any extra setting.

Sign in with an account that exists in the project you built against. Prod
accounts do not exist in Dev.

## One-time setup

1. **Env files.** Copy the templates and fill them in from Firebase Console →
   Project settings → Your apps (web app):

   ```bash
   cp .env.dev.example .env.dev
   cp .env.prod.example .env.prod
   ```

   Both files are gitignored. `scripts/with-env.js` refuses to build when a required
   key is missing, or when the project id belongs to the other environment.

   They are deliberately not named `.env.development` / `.env.production`: Expo
   loads those automatically based on `NODE_ENV`, which would mix environments.

2. **Phone.** Settings → About phone → tap *Build number* 7 times, then
   Developer options → enable *USB debugging*. Plug it in, accept the RSA prompt,
   and check it shows up:

   ```bash
   adb devices -l
   ```

   With an emulator also running, `expo run:android` asks which device to use.

## Local builds (USB)

| Command | What you get |
|---|---|
| `pnpm android:dev` / `pnpm android:prod` | Debug dev-client build with live reload from Metro on your Mac |
| `pnpm start:dev` / `pnpm start:prod` | Metro only, for a dev-client build that is already installed |
| `pnpm apk:dev` / `pnpm apk:prod` | Release build, JS bundled in. Runs unplugged, away from your Mac |

The phone reaches Metro over Wi-Fi on the same network. If it can't (office Wi-Fi,
VPN), tunnel it over USB instead:

```bash
adb reverse tcp:8081 tcp:8081
```

The release APK is at `android/app/build/outputs/apk/release/app-release.apk` and is
signed with the debug keystore. That's fine for side-loading, not for the Play Store.

### Switching environments

`/android` is generated (CNG) and gitignored. When it was last generated for the
other environment, `with-env.js` runs `expo prebuild --clean` first, so the build
never installs under the wrong package id. The first build after a switch is
slower. Environment *values* (keys, project ids) are baked in when the JS is
bundled, so restart Metro after editing an env file.

## Firebase App Distribution (send to testers)

```bash
pnpm distribute:dev                     # Dev build → "testers" group in mseller-dev-40a08
pnpm distribute:prod                    # Prod build → "testers" group in mobile-seller-v3
pnpm distribute:dev -- --groups qa,ops  # other groups (comma-separated aliases)
pnpm distribute:ios:dev                 # iOS: ad hoc build on EAS → same groups
pnpm distribute:ios:prod
```

`scripts/distribute-android.js`:

- builds the release APK for that environment on your Mac;
- sets `versionCode` to the git commit count, so each build upgrades the last one;
- uploads it with release notes: environment, version, `branch@sha` and the last 10 commits.
- builds ARM only (`armeabi-v7a,arm64-v8a`), which covers phones. Set `ANDROID_ARCHITECTURES=x86_64` to test on an Intel emulator.

It refuses to run with uncommitted changes, because every tester build must match a commit.
Pass `-- --allow-dirty` to override.

| | Dev | Prod |
|---|---|---|
| Firebase Android app | `1:1077247630111:android:1cd6826322c2465fb42e2a` | `1:744491375680:android:284590bf026c30af3453a5` |
| Firebase iOS app | `1:1077247630111:ios:acb9fb787dc65a33b42e2a` | `1:744491375680:ios:9808354e5ad788b83453a5` |
| Console | [mseller-dev-40a08 → App Distribution](https://console.firebase.google.com/project/mseller-dev-40a08/appdistribution) | [mobile-seller-v3 → App Distribution](https://console.firebase.google.com/project/mobile-seller-v3/appdistribution) |

### Automatic (GitHub Actions)

`.github/workflows/app-distribution.yml` runs the same script:

| Trigger | Build |
|---|---|
| Merge to `main` (code changes, not docs) | Dev and Prod, Android and iOS, in parallel → `testers` in each project |
| Actions → App Distribution → *Run workflow* | Pick the environment, the platform (`both`, `android`, `ios`) and the groups |

Each environment and platform runs as its own job, so one failed upload doesn't block the others.

Repo secrets: `ENV_DEV`, `ENV_PROD` (contents of `.env.dev` / `.env.prod`; update them
whenever you change those files), plus `FIREBASE_SERVICE_ACCOUNT_DEV` and
`FIREBASE_SERVICE_ACCOUNT_PROD`. Each service account is `app-distribution-ci` in its
project, with the *Firebase App Distribution Admin* role. iOS also needs `EXPO_TOKEN`.

### Manual

**One-time setup for whoever distributes:** `npm install -g firebase-tools`, then
`firebase login` with an account that has access to both projects.

**Adding testers:** Console → App Distribution → Testers & Groups → `testers` → Add
testers, or from the CLI:
`firebase appdistribution:testers:add --project mseller-dev-40a08 --group-alias testers a@x.com,b@y.com`.
Dev and Prod are separate projects, so add testers to each one they should get.

**What testers do:** open the invite email on the phone, accept it, and install
*Firebase App Tester* when asked. New builds then show up there with a notification.
Android will ask them to allow installs from unknown sources once.

**Signing:** APKs are signed with the debug keystore in the generated `/android`, the
same key for everyone. Android only installs an update over an existing app when both
are signed with the same key. A tester who switches between a Firebase build and an EAS
build of the same package must uninstall first.

### iOS

iOS builds are **ad hoc**: only iPhones registered in the Apple Developer account
(team `HDYHZ227JK`) *before* the build can install it. Apple allows 100 iPhones a year.

`scripts/distribute-ios.js` runs `eas build --profile preview-dev|preview-prod` on EAS,
waits, downloads the IPA and uploads it with the same release notes as Android. EAS holds
the Apple Distribution certificate and the ad hoc profile, and increments the build number.

**One-time setup (done for both apps; repeat only if the credentials are reset):**

EAS signs in to Apple with an **App Store Connect API key** rather than an Apple ID. Signing
in with the Apple ID fails with "iTunes service key is empty" (a known EAS CLI issue).

1. App Store Connect → Users and Access → Integrations → **Team Keys** → **+**, role **Admin**.
   Save the `.p8` as `~/.appstoreconnect/AuthKey_<KEY_ID>.p8` (`chmod 600`), never in the repo.
2. Create the certificate and ad hoc profiles, one command per app, in one line so the variables apply:
   ```bash
   EXPO_ASC_API_KEY_PATH="$HOME/.appstoreconnect/AuthKey_<KEY_ID>.p8" EXPO_ASC_KEY_ID=<KEY_ID> EXPO_ASC_ISSUER_ID=<ISSUER_UUID> EXPO_APPLE_TEAM_ID=HDYHZ227JK EXPO_APPLE_TEAM_TYPE=INDIVIDUAL npx eas-cli@latest build --platform ios --profile preview-dev
   ```
   Answer yes to logging in, to reusing or generating the distribution certificate and to the
   provisioning profile. Then run it again with `--profile preview-prod`.
3. CI token: create an access token at expo.dev → Account settings → Access tokens, then
   `gh secret set EXPO_TOKEN --repo MSeller/mseller-lite`.

To upload a build that already finished on EAS instead of starting a new one:
`pnpm distribute:ios:dev -- --build-id <eas-build-id>`.

**Adding an iOS tester:**

1. Register their iPhone with EAS: `npx eas-cli@latest device:create` → *Website* and send them
   the link. Or use *Export UDIDs* in Firebase App Distribution after they accept the invite,
   and add each one with `device:create` → *Input*.
2. Refresh the profile so it includes the new device: run the step 2 command above for each
   profile and answer *No, let me choose devices again* when asked to reuse the profile.
3. The **next** build includes them. Builds made before that won't install on their iPhone.

**What iOS testers do:** accept the invite on the iPhone in Safari, add the App Tester web
clip, and install from there. The first time, trust the developer in Settings →
General → VPN & Device Management.

## EAS builds (share with testers)

| Command | Profile | Output |
|---|---|---|
| `pnpm build:android:preview-dev` | `preview-dev` | Installable APK, Dev |
| `pnpm build:android:preview-prod` | `preview-prod` | Installable APK, Prod |
| `pnpm build:android:dev` | `development` | Dev-client APK, Dev |
| `pnpm build:android:prod` | `production` | Play Store AAB, Prod |

Each profile sets `APP_ENV` and reads its values from the matching EAS environment
(`eas env:list --environment development`). EAS shows an install link and QR code
when the build finishes.

## Troubleshooting

- **`SDK location not found`**: export `ANDROID_HOME`, or create
  `android/local.properties` with `sdk.dir=/Users/<you>/Library/Android/sdk`.
  `with-env.js` writes it for you when the SDK is in the default location.
- **`INSTALL_FAILED_UPDATE_INCOMPATIBLE`**: a build of the same package signed with
  another key (for example from EAS) is already installed. Uninstall it:
  `adb uninstall app.mseller.msellerlite.dev`.
- **Login fails with `auth/invalid-credential` on Dev**: the account only exists in Prod.
- **Wrong backend**: the DEV tag should match what you expect. `pnpm start` /
  `pnpm android` without a suffix still read `.env` and build as Prod.
