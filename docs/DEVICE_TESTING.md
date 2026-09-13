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
