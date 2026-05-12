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

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
  withPodfile,
  withDangerousMod,
  withInfoPlist,
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

// App Store validation rejects archives whose Info.plist does not name an
// AppIcon asset, even when the asset catalog itself is present and the
// matching ASSETCATALOG_COMPILER_APPICON_NAME build setting is correct.
// Expo's prebuild ships the single-universal-1024 catalog + the build
// setting but does not write `CFBundleIconName`, so Xcode skips icon
// compilation and the resulting .ipa is missing all required sizes
// (120/152/167/1024 px). Stamping the key here keeps the prebuild output
// submittable without a manual Xcode tweak after every iteration.
const withTraziaIconName = (config) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.CFBundleIconName = 'AppIcon';
    return cfg;
  });

// Apple's TestFlight validation rejects archives that are missing the
// 120×120 iPhone, 152×152 iPad, or 167×167 iPad Pro icons. Xcode 14's
// single-universal-1024 approach is supposed to generate those at
// archive time, but our Assets.car only ever picked up 120 + 152 and
// silently skipped 167 — the resulting .ipa came back rejected.
//
// Switch to the explicit-size catalog: a Contents.json that lists every
// idiom × scale Apple expects, plus one PNG per entry rendered from the
// 1024×1024 master by `sips` (macOS built-in, no ImageMagick required).
// `sips` strips transparency and resamples at archive-quality, matching
// what Apple's own asset compiler would produce.
const ICON_RENDITIONS = [
  // iPhone
  { idiom: 'iphone', size: '20x20', scale: '2x', px: 40 },
  { idiom: 'iphone', size: '20x20', scale: '3x', px: 60 },
  { idiom: 'iphone', size: '29x29', scale: '2x', px: 58 },
  { idiom: 'iphone', size: '29x29', scale: '3x', px: 87 },
  { idiom: 'iphone', size: '40x40', scale: '2x', px: 80 },
  { idiom: 'iphone', size: '40x40', scale: '3x', px: 120 },
  { idiom: 'iphone', size: '60x60', scale: '2x', px: 120 },
  { idiom: 'iphone', size: '60x60', scale: '3x', px: 180 },
  // iPad
  { idiom: 'ipad', size: '20x20', scale: '1x', px: 20 },
  { idiom: 'ipad', size: '20x20', scale: '2x', px: 40 },
  { idiom: 'ipad', size: '29x29', scale: '1x', px: 29 },
  { idiom: 'ipad', size: '29x29', scale: '2x', px: 58 },
  { idiom: 'ipad', size: '40x40', scale: '1x', px: 40 },
  { idiom: 'ipad', size: '40x40', scale: '2x', px: 80 },
  { idiom: 'ipad', size: '76x76', scale: '2x', px: 152 },
  { idiom: 'ipad', size: '83.5x83.5', scale: '2x', px: 167 },
  // App Store marketing
  { idiom: 'ios-marketing', size: '1024x1024', scale: '1x', px: 1024 },
];

const withTraziaAppIcon = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const iosNamedRoot = path.join(cfg.modRequest.platformProjectRoot, 'Trazia');
      const catalogDir = path.join(iosNamedRoot, 'Images.xcassets', 'AppIcon.appiconset');
      const masterIcon = path.join(projectRoot, 'assets', 'images', 'icon.png');

      if (!fs.existsSync(masterIcon)) {
        // No master icon — leave Expo's single-universal output untouched
        // so subsequent prebuilds still complete. App Store will reject
        // again, which is the right signal to put the asset in place.
        return cfg;
      }

      fs.mkdirSync(catalogDir, { recursive: true });

      // Wipe any previous renditions (single-universal, partial runs)
      // before regenerating so stale entries can't leak into the
      // archived catalog.
      for (const file of fs.readdirSync(catalogDir)) {
        if (file.endsWith('.png') || file === 'Contents.json') {
          fs.rmSync(path.join(catalogDir, file));
        }
      }

      const images = [];
      for (const rendition of ICON_RENDITIONS) {
        const filename = `Icon-${rendition.idiom}-${rendition.size}@${rendition.scale}.png`;
        const target = path.join(catalogDir, filename);
        // sips resamples to an exact square (`-z H W`) while preserving
        // the source's colour space. The master icon is already RGB-only
        // (no alpha) per Apple's submission requirements, so we don't
        // need to strip transparency — sips's `-s hasAlpha NO` errors on
        // alphaless PNGs anyway.
        execFileSync(
          'sips',
          [
            '-s',
            'format',
            'png',
            '-z',
            String(rendition.px),
            String(rendition.px),
            masterIcon,
            '--out',
            target,
          ],
          { stdio: 'ignore' },
        );
        images.push({
          idiom: rendition.idiom,
          size: rendition.size,
          scale: rendition.scale,
          filename,
        });
      }

      const contents = {
        images,
        info: { version: 1, author: 'trazia-build-automation' },
      };
      fs.writeFileSync(
        path.join(catalogDir, 'Contents.json'),
        `${JSON.stringify(contents, null, 2)}\n`,
        'utf8',
      );
      return cfg;
    },
  ]);

module.exports = function withTraziaBuild(config) {
  config = withTraziaPodfile(config);
  config = withTraziaXcodeEnvLocal(config);
  config = withTraziaXcodeProject(config);
  config = withTraziaIconName(config);
  config = withTraziaAppIcon(config);
  return config;
};
