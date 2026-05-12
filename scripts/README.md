# Trazia release scripts

## `build-testflight.sh` — one-command TestFlight build + upload

Replaces the manual "every-build" ritual: prebuild → User Script Sandboxing
NO → NODE_OPTIONS=8192 → Signing Team → Any iOS Device → Archive → Distribute
→ Upload.

```bash
./scripts/build-testflight.sh
# or, equivalently:
npm run submit
```

### What it does

| Step | Notes |
| --- | --- |
| 1. Preflight | Confirms `xcodebuild`, `xcrun`, `pod` exist in PATH and that the `AC_PASSWORD` keychain item is present. |
| 2. Dirty check | Aborts if the working tree has uncommitted changes (override with `--dirty`). |
| 3. Quality gates | `npm run typecheck && npm run lint && npm test` (skip with `--skip-checks`). |
| 4. Prebuild | `expo prebuild --clean`. The local config plugin `plugins/with-trazia-build.js` re-applies the Podfile, `.xcode.env.local`, and `pbxproj` patches that used to be manual. |
| 5. Pod install | `(cd ios && pod install)`. |
| 6. Archive | `xcodebuild archive` with `-destination generic/platform=iOS`, Release config, `NODE_OPTIONS=--max-old-space-size=8192` in env. |
| 7. Export | `xcodebuild -exportArchive` with `scripts/build/ExportOptions.plist`. |
| 8. Upload | `xcrun altool --upload-app` against App Store Connect (skip with `--no-upload`). |

### Flags

```text
--dirty        Allow uncommitted changes in the working tree.
--dry-run      Print every command without running prebuild/build/upload.
--skip-checks  Skip typecheck/lint/test (useful when iterating on signing).
--no-upload    Stop after exportArchive — useful to inspect the .ipa locally.
--help         Print this list.
```

## One-time setup

### 1. App-Specific Password in the macOS keychain

App Store Connect (and `xcrun altool`) requires an app-specific password —
your regular Apple ID password will not work.

1. Sign in at <https://appleid.apple.com/account/manage>.
2. Sign-In and Security → App-Specific Passwords → **Generate password** (e.g. label
   it `Trazia altool`). Copy the password.
3. Store it once in the macOS keychain:

   ```bash
   xcrun altool --store-password-in-keychain-item AC_PASSWORD \
     -u tim.hobrlant@gmail.com -p <app-specific-password>
   ```

The script's preflight then resolves `@keychain:AC_PASSWORD` and uploads
without any further prompts.

### 2. Xcode signing prerequisite

The first Release archive on a fresh Mac needs an Apple Developer account
signed in inside Xcode (Xcode → Settings → Accounts). Automatic signing
then provisions the distribution certificate on demand — no manual cert
import required. The config plugin pins `DEVELOPMENT_TEAM=J5PLN5P9Z2` so
the Team dropdown in the project settings is correct out of the box.

## Troubleshooting

| Symptom | Diagnosis / fix |
| --- | --- |
| `Missing keychain item "AC_PASSWORD"` | Run the `xcrun altool --store-password-in-keychain-item` command above. |
| `Code Signing Error … no profiles found` | Open `Trazia.xcworkspace` once, let Xcode "fix the issue" — automatic signing will create a fresh provisioning profile for your team. Re-run the script. |
| `xcodebuild … sandbox-deny … react-native-xcode.sh` | The config plugin should have set `ENABLE_USER_SCRIPT_SANDBOXING=NO`. Confirm with `grep ENABLE_USER_SCRIPT_SANDBOXING ios/Podfile`. If the marker line is missing the plugin didn't run — make sure `plugins/with-trazia-build.js` is in `app.json:plugins`. |
| `JavaScript heap out of memory` during archive | NODE_OPTIONS isn't reaching Hermes. Check `cat ios/.xcode.env.local` — it should contain `export NODE_OPTIONS="--max-old-space-size=8192"`. |
| `Invalid Apple ID or password` from altool | App-Specific Password rotated or wrong account. Regenerate at appleid.apple.com and re-run the keychain `--store-password-in-keychain-item` command. |
| Upload succeeds but TestFlight shows no build | Processing typically takes 5–15 min. If it's been over an hour, check App Store Connect → TestFlight → Activity for ITMS validation errors (privacy strings, missing entitlements). |

## Why this isn't Fastlane / EAS

- **Fastlane**: overkill for a one-developer setup; another Ruby toolchain to keep current.
- **EAS Build**: requires an Expo account + remote builds; we prefer local archives so we don't depend on Expo's queue or pay for cloud builds.

If we ever onboard a second developer or want CI builds, Fastlane match +
remote signing become the natural next step — the existing config plugin
already keeps the project ready for that move.
