#!/usr/bin/env node
/**
 * Builds a release APK and sends it to testers through Firebase App Distribution.
 * Run it through with-env.js so the right environment is loaded and /android matches it:
 *
 *   node scripts/with-env.js development node scripts/distribute-android.js [--groups a,b] [--allow-dirty]
 *
 * - versionCode is the commit count, so every distributed build upgrades the previous one.
 * - Refuses a dirty working tree: testers must get a build that maps to a commit.
 * - Release notes carry the environment, version, branch@sha and the latest commits.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { APP_ENVS, resolveAppEnv } = require("../app.variants");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);

const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

const flagValue = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const git = (...gitArgs) => {
  const result = spawnSync("git", gitArgs, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) fail(`git ${gitArgs.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
};

const run = (cmd, cmdArgs, options = {}) => {
  const result = spawnSync(cmd, cmdArgs, { cwd: root, stdio: "inherit", ...options });
  if (result.error) fail(`${cmd}: ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
};

if (!process.env.APP_ENV) {
  fail("Run through scripts/with-env.js, e.g. `pnpm distribute:dev`.");
}
const appEnv = resolveAppEnv();
const variant = APP_ENVS[appEnv];
const groups = flagValue("--groups") || process.env.FIREBASE_TESTER_GROUPS || "testers";

if (spawnSync("firebase", ["--version"], { stdio: "ignore" }).status !== 0) {
  fail("Firebase CLI not found. Install it with `npm install -g firebase-tools` and run `firebase login`.");
}

if (!args.includes("--allow-dirty") && git("status", "--porcelain")) {
  fail("Working tree has uncommitted changes. Commit them, or pass --allow-dirty.");
}

const versionCode = git("rev-list", "--count", "HEAD");
const sha = git("rev-parse", "--short", "HEAD");
// CI checks out tags and merge commits detached, where --abbrev-ref only says "HEAD".
const branch = process.env.GITHUB_REF_NAME || git("rev-parse", "--abbrev-ref", "HEAD");
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

const notes = [
  `[${appEnv === "production" ? "PROD" : "DEV"}] ${version} (${versionCode}) — ${branch}@${sha}`,
  `Firebase: ${variant.firebaseProjectId}`,
  "",
  git("log", "-10", "--no-merges", "--pretty=format:• %s"),
].join("\n");
const notesFile = path.join(os.tmpdir(), `mseller-lite-release-notes-${sha}.txt`);
fs.writeFileSync(notesFile, notes);

run("firebase", [
  "appdistribution:distribute",
  apk,
  "--app",
  variant.firebaseAndroidAppId,
  "--groups",
  groups,
  "--release-notes-file",
  notesFile,
]);

fs.rmSync(notesFile, { force: true });
console.log(`\n✔ Sent ${variant.name} ${version} (${versionCode}) to "${groups}"\n`);
