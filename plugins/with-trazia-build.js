/**
 * Trazia build-automation Expo config plugin.
 *
 * Runs at `expo prebuild` time and re-applies three patches that otherwise
 * have to be re-done by hand after every prebuild:
 *
 *   1. Podfile post_install: disable ENABLE_USER_SCRIPT_SANDBOXING (XCBuild
 *      otherwise rejects the React Native bundle phase with sandbox-deny
 *      errors), and pin DEVELOPMENT_TEAM + CODE_SIGN_STYLE on the Trazia
 *      app target.
 *
 *   2. `ios/.xcode.env.local`: append `export NODE_OPTIONS=--max-old-space-size=8192`
 *      so the Hermes/Metro bundle step doesn't OOM during Release archives.
 *      The standard Xcode bundle build phase already sources `.xcode.env.local`
 *      at the very top, which is cleaner than patching the build phase's
 *      shellScript directly inside `project.pbxproj`.
 *
 *   3. App-target build settings (DEVELOPMENT_TEAM + CODE_SIGN_STYLE) on
 *      the Trazia.xcodeproj via the xcode npm package. The Podfile-side
 *      patch also sets these, but doing it on the user project too means
 *      a developer who opens Xcode straight after prebuild (before running
 *      `pod install`) still gets the right signing config.
 *
 * Every patch is idempotent: re-running the plugin (i.e. another
 * `expo prebuild`) detects an existing marker comment / setting and is a
 * no-op. Hand-edits made between prebuilds are preserved unless they
 * conflict with the values the plugin manages.
 *
 * Keep the team ID + NODE_OPTIONS value in lock-step with `scripts/build-testflight.sh`.
 */

const fs = require('node:fs');
const path = require('node:path');

const {
  withPodfile,
  withDangerousMod,
  withXcodeProject,
} = require('@expo/config-plugins');

const TEAM_ID = 'J5PLN5P9Z2';
const NODE_OPTIONS_VALUE = '--max-old-space-size=8192';
const NODE_OPTIONS_LINE = `export NODE_OPTIONS="${NODE_OPTIONS_VALUE}"`;

const PODFILE_MARKER = '# trazia-build-automation: post_install patches';

const POST_INSTALL_PATCH = `
  ${PODFILE_MARKER}
  installer.pods_project.targets.each do |t|
    t.build_configurations.each do |config|
      config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    end
  end
  installer.aggregate_targets.each do |aggregate|
    aggregate.user_project.targets.each do |t|
      next unless t.name == 'Trazia'
      t.build_configurations.each do |config|
        config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
        config.build_settings['DEVELOPMENT_TEAM'] = '${TEAM_ID}'
        config.build_settings['CODE_SIGN_STYLE'] = 'Automatic'
      end
    end
    aggregate.user_project.save
  end
`;

function patchPodfile(contents) {
  if (contents.includes(PODFILE_MARKER)) return contents;

  // Inject our patch as the last statement inside the existing
  // `post_install do |installer|` block. The Expo template's Podfile
  // already opens that block and only ever has one — find the matching
  // `end` and splice in front of it.
  const postInstallStart = contents.indexOf('post_install do |installer|');
  if (postInstallStart === -1) {
    // Fall back: append a brand-new post_install hook before the closing
    // target/post_install marker. This branch should never trigger for
    // current Expo templates.
    return contents.replace(
      /(\n\s*end\s*$)/,
      `\n  post_install do |installer|${POST_INSTALL_PATCH}  end\n$1`,
    );
  }

  // Walk forward from the matching `do |installer|` to find the `end`
  // that closes the block. We count nested `do`/`end` pairs so blocks
  // inside (e.g. `targets.each do …`) don't fool the matcher.
  let depth = 1;
  let i = contents.indexOf('\n', postInstallStart) + 1;
  while (i < contents.length && depth > 0) {
    const lineEnd = contents.indexOf('\n', i);
    const line = contents.slice(i, lineEnd === -1 ? contents.length : lineEnd);
    const trimmed = line.trim();
    if (/(^|\s)do(\s|\||$)/.test(trimmed)) depth++;
    if (/^end\b/.test(trimmed)) {
      depth--;
      if (depth === 0) {
        // Splice the patch just before this `end` line.
        return contents.slice(0, i) + POST_INSTALL_PATCH + contents.slice(i);
      }
    }
    i = (lineEnd === -1 ? contents.length : lineEnd) + 1;
  }
  return contents;
}

const withTraziaPodfile = (config) =>
  withPodfile(config, (cfg) => {
    cfg.modResults.contents = patchPodfile(cfg.modResults.contents);
    return cfg;
  });

const withTraziaXcodeEnvLocal = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const envPath = path.join(cfg.modRequest.platformProjectRoot, '.xcode.env.local');
      let existing = '';
      try {
        existing = fs.readFileSync(envPath, 'utf8');
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      if (existing.includes('NODE_OPTIONS=')) {
        // Already managed (either by us or by hand) — leave it alone.
        return cfg;
      }
      const next =
        existing.length === 0 || existing.endsWith('\n')
          ? `${existing}${NODE_OPTIONS_LINE}\n`
          : `${existing}\n${NODE_OPTIONS_LINE}\n`;
      fs.writeFileSync(envPath, next, 'utf8');
      return cfg;
    },
  ]);

const withTraziaXcodeProject = (config) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configs = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configs)) {
      const entry = configs[key];
      if (!entry || typeof entry !== 'object' || !entry.buildSettings) continue;
      // Only touch the Trazia app target — leave Pods/test targets alone.
      const productName = entry.buildSettings.PRODUCT_NAME;
      if (productName !== '"Trazia"' && productName !== 'Trazia') continue;
      entry.buildSettings.DEVELOPMENT_TEAM = TEAM_ID;
      entry.buildSettings.CODE_SIGN_STYLE = 'Automatic';
      entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
    }
    return cfg;
  });

module.exports = function withTraziaBuild(config) {
  config = withTraziaPodfile(config);
  config = withTraziaXcodeEnvLocal(config);
  config = withTraziaXcodeProject(config);
  return config;
};
