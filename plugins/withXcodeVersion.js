const { withXcodeProject } = require("expo/config-plugins");

/**
 * Prebuild writes the app version into Info.plist but leaves the Xcode target's
 * MARKETING_VERSION / CURRENT_PROJECT_VERSION at the template's 1.0 / 1, so the
 * project's Identity panel disagrees with the app. Keep them in step with
 * `expo.version` and `ios.buildNumber` (EAS sets the build number remotely, so
 * locally it stays at 1 unless configured).
 */
module.exports = function withXcodeVersion(config) {
  return withXcodeProject(config, (mod) => {
    const version = config.version ?? "1.0.0";
    const build = config.ios?.buildNumber ?? "1";
    const configurations = mod.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const settings = configurations[key].buildSettings;
      if (settings && settings.MARKETING_VERSION !== undefined) {
        settings.MARKETING_VERSION = version;
        settings.CURRENT_PROJECT_VERSION = build;
      }
    }
    return mod;
  });
};
