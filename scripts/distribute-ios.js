#!/usr/bin/env node
/**
 * Builds an ad hoc IPA on EAS and sends it to testers through Firebase App Distribution.
 *
 *   node scripts/distribute-ios.js <development|production> [--groups a,b] [--allow-dirty] [--build-id <id>]
 *
 * - Builds on EAS (profile preview-dev / preview-prod), which holds the Apple
 *   Distribution certificate and the ad hoc provisioning profile. Only iPhones
 *   registered with `eas device:create` before the build can install it.
 * - The build number is incremented remotely by EAS (appVersionSource: remote).
 * - Refuses a dirty working tree: testers must get a build that maps to a commit.
 * - `--build-id` uploads a build that already finished on EAS instead of starting one.
 * - Needs `eas login` locally, or EXPO_TOKEN in CI.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { APP_ENVS, resolveAppEnv } = require("../app.variants");
const {
  root,
  args,
  fail,
  requireCli,
  requireCleanTree,
  gitInfo,
  testerGroups,
  distributeToFirebase,
  flagValue,
} = require("./distribution-common");

const PROFILES = { development: "preview-dev", production: "preview-prod" };

const envArg = args.find((arg) => APP_ENVS[arg]);
if (!envArg) {
  fail("Usage: node scripts/distribute-ios.js <development|production> [--groups a,b] [--allow-dirty] [--build-id <id>]");
}
const appEnv = resolveAppEnv(envArg);
const variant = APP_ENVS[appEnv];
const profile = PROFILES[appEnv];
const groups = testerGroups();

const existingBuildId = flagValue("--build-id");

requireCli("eas", "Install it with `npm install -g eas-cli` and run `eas login`.");
if (!existingBuildId) requireCleanTree();

const { sha, branch } = gitInfo();
console.log(
  existingBuildId
    ? `\n▶ ${variant.name} (iOS) — EAS build ${existingBuildId} → groups: ${groups}\n`
    : `\n▶ ${variant.name} (iOS) — ${branch}@${sha} → EAS profile ${profile} → groups: ${groups}\n`,
);

// --json sends the build to stdout; progress still streams on stderr.
const build = spawnSync(
  "eas",
  existingBuildId
    ? ["build:view", existingBuildId, "--json"]
    : ["build", "--platform", "ios", "--profile", profile, "--non-interactive", "--wait", "--json"],
  { cwd: root, encoding: "utf8", stdio: ["inherit", "pipe", "inherit"], maxBuffer: 16 * 1024 * 1024 },
);
if (build.error) fail(`eas: ${build.error.message}`);
if (build.status !== 0) {
  fail(
    "EAS build failed. If it asked for credentials, run once interactively: " +
      `\`eas build --platform ios --profile ${profile}\` (see docs/DEVICE_TESTING.md).`,
  );
}

let result;
try {
  // `eas build` prints a list; `eas build:view` prints one build.
  const parsed = JSON.parse(build.stdout.slice(build.stdout.search(/[[{]/)));
  result = Array.isArray(parsed) ? parsed[0] : parsed;
} catch {
  fail(`Could not read the EAS build result:\n${build.stdout}`);
}
const ipaUrl = result?.artifacts?.applicationArchiveUrl || result?.artifacts?.buildUrl;
if (result?.platform && result.platform !== "IOS") fail(`EAS build ${result.id} is not an iOS build.`);
if (result?.status !== "FINISHED" || !ipaUrl) {
  fail(`EAS build ${result?.id ?? ""} did not produce an IPA (status: ${result?.status}).`);
}

const main = async () => {
  const ipa = path.join(os.tmpdir(), `mseller-lite-${appEnv}-${result.id}.ipa`);
  const response = await fetch(ipaUrl);
  if (!response.ok) fail(`Downloading the IPA failed: HTTP ${response.status}`);
  fs.writeFileSync(ipa, Buffer.from(await response.arrayBuffer()));

  try {
    distributeToFirebase({
      binary: ipa,
      firebaseAppId: variant.firebaseIosAppId,
      appEnv,
      variant,
      version: result.appVersion,
      build: result.appBuildVersion,
      groups,
    });
  } finally {
    fs.rmSync(ipa, { force: true });
  }
};

main().catch((error) => fail(error.message));
