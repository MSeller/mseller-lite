#!/usr/bin/env node
/**
 * Runs a command against one environment:
 *
 *   node scripts/with-env.js <development|production> <command...>
 *
 * - Loads ONLY that environment's .env file. Expo's own .env loading is turned off
 *   (EXPO_NO_DOTENV), otherwise any key missing from .env.development would be
 *   silently filled in from the production values in .env.
 * - Refuses to run when a required Firebase key is missing or the project id belongs
 *   to the other environment.
 * - Regenerates /android when it was prebuilt for the other environment, since
 *   `expo run:android` reuses an existing native project and would install under the
 *   wrong package id.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const dotenv = require("dotenv");
const {
  APP_ENVS,
  REQUIRED_ENV_VARS,
  resolveAppEnv,
  getPackageId,
} = require("../app.variants");

const root = path.resolve(__dirname, "..");
const [rawEnv, ...command] = process.argv.slice(2);

const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

if (!rawEnv || command.length === 0) {
  fail("Usage: node scripts/with-env.js <development|production> <command...>");
}

let appEnv;
try {
  appEnv = resolveAppEnv(rawEnv);
} catch (error) {
  fail(error.message);
}

const variant = APP_ENVS[appEnv];
const envPath = path.join(root, variant.envFile);
if (!fs.existsSync(envPath)) {
  fail(
    `${variant.envFile} is missing. Copy ${variant.envFile}.example and fill it in (see docs/DEVICE_TESTING.md).`,
  );
}

const fileVars = dotenv.parse(fs.readFileSync(envPath));
const missing = REQUIRED_ENV_VARS.filter((key) => !fileVars[key]);
if (missing.length > 0) {
  fail(`${variant.envFile} is missing: ${missing.join(", ")}`);
}

if (fileVars.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== variant.firebaseProjectId) {
  fail(
    `${variant.envFile} points at Firebase project "${fileVars.EXPO_PUBLIC_FIREBASE_PROJECT_ID}", ` +
      `but ${appEnv} must use "${variant.firebaseProjectId}".`,
  );
}

const env = {
  ...process.env,
  ...fileVars,
  APP_ENV: appEnv,
  EXPO_NO_DOTENV: "1",
};

const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { cwd: root, env, stdio: "inherit" });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const touchesAndroid = command.some((arg) => arg.includes("android"));
const gradleFile = path.join(root, "android", "app", "build.gradle");
if (touchesAndroid && fs.existsSync(gradleFile)) {
  const packageId = getPackageId(appEnv);
  const gradle = fs.readFileSync(gradleFile, "utf8");
  if (!gradle.includes(`applicationId '${packageId}'`)) {
    console.log(`\n↻ /android was prebuilt for another environment — regenerating for ${packageId}\n`);
    run("pnpm", ["exec", "expo", "prebuild", "--platform", "android", "--clean", "--no-install"]);
  }
}

// A clean prebuild drops android/local.properties, and Gradle cannot find the SDK
// without it unless ANDROID_HOME is exported in this shell.
const localProperties = path.join(root, "android", "local.properties");
if (touchesAndroid && fs.existsSync(path.dirname(localProperties)) && !fs.existsSync(localProperties)) {
  const sdkDir = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), "Library", "Android", "sdk"),
    path.join(os.homedir(), "Android", "Sdk"),
  ].find((dir) => dir && fs.existsSync(dir));
  if (sdkDir) {
    fs.writeFileSync(localProperties, `sdk.dir=${sdkDir}\n`);
  }
}

console.log(`\n▶ ${variant.name} → Firebase ${variant.firebaseProjectId}\n`);
run(command[0], command.slice(1));
