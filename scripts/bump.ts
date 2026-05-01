import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run as `node scripts/bump.ts <patch|minor|major|build>` (Node 24+ strips
// the .ts types natively). Mutates app.json in place: bumps the semver
// version (unless `build` is passed) and always increments
// ios.buildNumber + android.versionCode by 1. Designed to be run before
// `eas build --auto-submit` so the artifacts carry monotonic versions
// the App Store / Play console accept.

type Bump = 'patch' | 'minor' | 'major' | 'build';

const arg = process.argv[2] ?? 'patch';
if (arg !== 'patch' && arg !== 'minor' && arg !== 'major' && arg !== 'build') {
  console.error(`Usage: node scripts/bump.ts <patch|minor|major|build>`);
  process.exit(1);
}
const bumpKind: Bump = arg;

const here = dirname(fileURLToPath(import.meta.url));
const appJsonPath = resolve(here, '..', 'app.json');

interface ExpoConfig {
  expo: {
    version: string;
    ios?: { buildNumber?: string };
    android?: { versionCode?: number };
    [key: string]: unknown;
  };
}

const raw = readFileSync(appJsonPath, 'utf8');
const json = JSON.parse(raw) as ExpoConfig;

const versionParts = json.expo.version.split('.').map((part) => Number.parseInt(part, 10));
if (versionParts.length !== 3 || versionParts.some((n) => Number.isNaN(n))) {
  console.error(`Unexpected version format: ${json.expo.version}`);
  process.exit(1);
}
const [major, minor, patch] = versionParts as [number, number, number];

let nextVersion = json.expo.version;
if (bumpKind === 'major') nextVersion = `${major + 1}.0.0`;
else if (bumpKind === 'minor') nextVersion = `${major}.${minor + 1}.0`;
else if (bumpKind === 'patch') nextVersion = `${major}.${minor}.${patch + 1}`;

const currentBuild = Number.parseInt(json.expo.ios?.buildNumber ?? '0', 10);
const nextBuild = (Number.isFinite(currentBuild) ? currentBuild : 0) + 1;
const currentVersionCode = json.expo.android?.versionCode ?? 0;
const nextVersionCode = currentVersionCode + 1;

json.expo.version = nextVersion;
json.expo.ios = { ...(json.expo.ios ?? {}), buildNumber: String(nextBuild) };
json.expo.android = { ...(json.expo.android ?? {}), versionCode: nextVersionCode };

writeFileSync(appJsonPath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');

console.log(
  `Trazia bump (${bumpKind}): version=${nextVersion} ios.buildNumber=${nextBuild} android.versionCode=${nextVersionCode}`,
);
console.log('Next:');
console.log(`  git tag -a v${nextVersion} -m "Trazia v${nextVersion}"`);
console.log('  git push --tags');
