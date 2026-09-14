/**
 * Shared by scripts/distribute-android.js and scripts/distribute-ios.js: argument
 * parsing, the clean-tree rule, release notes and the Firebase App Distribution upload,
 * so a tester sees the same notes and grouping whichever platform they are on.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);

const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

/** A command that exited non-zero; its status becomes the script's exit code. */
class CommandError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// run() throws instead of exiting so `finally` cleanup (release notes, a downloaded IPA)
// still runs; the error only surfaces here, after the stack has unwound.
process.on("uncaughtException", (error) => {
  console.error(`\n✖ ${error.message}\n`);
  process.exit(error instanceof CommandError ? error.status : 1);
});

/** The value after `name`; undefined when the flag is absent, null when it has no value. */
const flagValue = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : null;
};

const git = (...gitArgs) => {
  const result = spawnSync("git", gitArgs, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) fail(`git ${gitArgs.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
};

const run = (cmd, cmdArgs, options = {}) => {
  const result = spawnSync(cmd, cmdArgs, { cwd: root, stdio: "inherit", ...options });
  if (result.error) throw new CommandError(`${cmd}: ${result.error.message}`, 1);
  if (result.status !== 0) {
    throw new CommandError(`${cmd} exited with status ${result.status ?? 1}`, result.status ?? 1);
  }
};

const requireCli = (cmd, installHint) => {
  if (spawnSync(cmd, ["--version"], { stdio: "ignore" }).status !== 0) {
    fail(`${cmd} not found. ${installHint}`);
  }
};

/** Testers must get a build that maps to a commit. */
const requireCleanTree = () => {
  if (!args.includes("--allow-dirty") && git("status", "--porcelain")) {
    fail("Working tree has uncommitted changes. Commit them, or pass --allow-dirty.");
  }
};

const gitInfo = () => ({
  commitCount: git("rev-list", "--count", "HEAD"),
  sha: git("rev-parse", "--short", "HEAD"),
  // CI checks out merge commits detached, where --abbrev-ref only says "HEAD".
  branch: process.env.GITHUB_REF_NAME || git("rev-parse", "--abbrev-ref", "HEAD"),
});

const testerGroups = () => {
  const groups = flagValue("--groups");
  if (groups === null) fail("--groups needs a comma-separated list of group aliases.");
  return groups || process.env.FIREBASE_TESTER_GROUPS || "testers";
};

/**
 * Uploads a built APK or IPA to App Distribution with release notes carrying the
 * environment, version, branch@sha and the latest commits.
 */
const distributeToFirebase = ({ binary, firebaseAppId, appEnv, variant, version, build, groups }) => {
  requireCli("firebase", "Install it with `npm install -g firebase-tools` and run `firebase login`.");
  const { sha, branch } = gitInfo();

  const notes = [
    `[${appEnv === "production" ? "PROD" : "DEV"}] ${version} (${build}) — ${branch}@${sha}`,
    `Firebase: ${variant.firebaseProjectId}`,
    "",
    git("log", "-10", "--no-merges", "--pretty=format:• %s"),
  ].join("\n");
  const notesFile = path.join(os.tmpdir(), `mseller-lite-release-notes-${sha}-${path.extname(binary).slice(1)}.txt`);
  fs.writeFileSync(notesFile, notes);

  try {
    run("firebase", [
      "appdistribution:distribute",
      binary,
      "--app",
      firebaseAppId,
      "--groups",
      groups,
      "--release-notes-file",
      notesFile,
    ]);
  } finally {
    fs.rmSync(notesFile, { force: true });
  }

  console.log(`\n✔ Sent ${variant.name} ${version} (${build}) to "${groups}"\n`);
};

module.exports = {
  root,
  args,
  fail,
  flagValue,
  git,
  run,
  requireCli,
  requireCleanTree,
  gitInfo,
  testerGroups,
  distributeToFirebase,
};
