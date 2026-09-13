#!/usr/bin/env node
/**
 * Builds a release APK and sends it to testers through Firebase App Distribution.
 * Run it through with-env.js so the right environment is loaded and /android matches it:
 *
 *   node scripts/with-env.js development node scripts/distribute-android.js [--groups a,b] [--allow-dirty]
 *
 * - versionCode is the commit count, so every distributed build upgrades the previous one.
 * - Refuses a dirty working tree: testers must get a build that maps to a commit.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { APP_ENVS, resolveAppEnv } = require("../app.variants");
const {
  root,
  fail,
  run,
  requireCleanTree,
  gitInfo,
  testerGroups,
  distributeToFirebase,
} = require("./distribution-common");

if (!process.env.APP_ENV) {
  fail("Run through scripts/with-env.js, e.g. `pnpm distribute:dev`.");
}
const appEnv = resolveAppEnv();
const variant = APP_ENVS[appEnv];
const groups = testerGroups();

requireCleanTree();

const { commitCount: versionCode, sha, branch } = gitInfo();
const env = { ...process.env, ANDROID_VERSION_CODE: versionCode };

const config = spawnSync("pnpm", ["exec", "expo", "config", "--type", "public", "--json"], {
  cwd: root,
  env,
  encoding: "utf8",
});
if (config.status !== 0) fail(`expo config failed: ${config.stderr}`);
const { version, android } = JSON.parse(config.stdout.slice(config.stdout.indexOf("{")));
if (String(android.versionCode) !== versionCode) {
  fail(`expo config resolved versionCode ${android.versionCode}, expected ${versionCode}.`);
}

console.log(`\n▶ ${variant.name} ${version} (${versionCode}) — ${branch}@${sha} → groups: ${groups}\n`);

// Re-apply the config so the new versionCode lands in android/app/build.gradle.
run("pnpm", ["exec", "expo", "prebuild", "--platform", "android", "--no-install"], { env });
// Phones are ARM. Skipping the x86 ABIs roughly halves the native compile, which
// dominates a cold build; override with ANDROID_ARCHITECTURES for an x86 emulator.
const architectures = process.env.ANDROID_ARCHITECTURES || "armeabi-v7a,arm64-v8a";
run("./gradlew", ["app:assembleRelease", "-x", "lint", "-x", "test", `-PreactNativeArchitectures=${architectures}`], {
  cwd: path.join(root, "android"),
  env,
});

const apk = path.join(root, "android", "app", "build", "outputs", "apk", "release", "app-release.apk");
if (!fs.existsSync(apk)) fail(`APK not found at ${apk}`);

distributeToFirebase({
  binary: apk,
  firebaseAppId: variant.firebaseAndroidAppId,
  appEnv,
  variant,
  version,
  build: versionCode,
  groups,
});
