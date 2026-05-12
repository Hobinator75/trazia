# `ios/Trazia/` missing — forensic inventory + repair

Snapshot at the start of `debug/find-and-fix-trazia-state`. Captured to
explain what happened, what fixed it, and how the build script now
guards against the same failure.

## Phase 1 — Inventory (what's on disk)

### Top-level project location

Only one Trazia project tree on this Mac (confirmed via `find ~ -type d
-name "Trazia"` excluding caches/DerivedData):

```
~/Desktop/Trazia/app                  ← the project (this repo)
~/Desktop/Trazia/                     ← parent folder, contains nothing else relevant
~/Documents/Claude/Projects/Trazia/   ← studio repo (legal/marketing only, no iOS sources)
```

No stray Trazia folders elsewhere. No backup of `ios/Trazia/*` on disk —
`find ~ -name "AppDelegate.swift"` and `find ~ -path "*Trazia/Info.plist"`
both return zero rows outside the freshly regenerated tree.

### `ios/` snapshot at the moment the build broke

```
ios/
├── .gitignore
├── .xcode.env
├── .xcode.env.local                     # NODE_OPTIONS from the config plugin
├── build/generated/…                    # leftover from a previous archive attempt
├── Podfile
├── Podfile.lock
├── Podfile.properties.json
├── Pods/
├── Trazia.xcodeproj/                    # ← present, references files below
└── Trazia.xcworkspace/
```

Missing: the entire `ios/Trazia/` directory (AppDelegate.swift,
Info.plist, SplashScreen.storyboard, Images.xcassets, PrivacyInfo.xcprivacy,
Trazia-Bridging-Header.h, Trazia.entitlements, Supporting/).

Confirmed expected paths from `project.pbxproj`:

```
AppDelegate.swift              path = Trazia/AppDelegate.swift
Info.plist                     path = Trazia/Info.plist
Images.xcassets                path = Trazia/Images.xcassets
SplashScreen.storyboard        path = Trazia/SplashScreen.storyboard
PrivacyInfo.xcprivacy          path = Trazia/PrivacyInfo.xcprivacy
Trazia-Bridging-Header.h       path = Trazia/Trazia-Bridging-Header.h
Trazia/Supporting              path = Trazia/Supporting (group)
```

### Git state

- Branch: `feat/build-automation` (clean working tree at debug branch
  creation).
- Root `.gitignore` excludes `/ios` so the whole native tree is
  uncommitted-by-design — there is no version-controlled copy to roll
  back to.
- `ios/.gitignore` excludes `build/`, `Pods/`, `.xcode.env.local`,
  `xcuserdata`, `*.xcuserstate`, etc. — also no relevant tracked
  content.

### Expo config + plugin

- `app.json` plugins: expo-router, expo-splash-screen, expo-sqlite,
  expo-localization, datetimepicker, expo-audio, react-native-google-mobile-ads,
  expo-tracking-transparency, expo-asset, expo-build-properties, and the
  local `./plugins/with-trazia-build.js`.
- `plugins/with-trazia-build.js` does **not** delete anything. Confirmed
  by source inspection: only `fs.readFileSync` + `fs.writeFileSync` on
  `ios/.xcode.env.local`, `withPodfile` (string-splice on Podfile), and
  `withXcodeProject` (in-memory pbxproj mutation via the `xcode`
  package). No `rmSync`/`unlinkSync` anywhere.

### DerivedData

`~/Library/Developer/Xcode/DerivedData/Trazia-cksizjkedglvzsgzvqjkoucfrzxb`
exists — a remnant of an earlier Xcode session. Not the source of
truth; safe to ignore.

## Phase 2 — Diagnosis

Reproduction matrix:

| Step | Action | `ios/Trazia/` after | Notes |
| --- | --- | --- | --- |
| Starting state | (broken) | **absent** | Reported by Tim |
| Re-run `npx expo prebuild --clean --no-install` | with our plugin enabled | **present** (8 files, fresh timestamps) | All expected sources regenerated |
| Repeat `npx expo prebuild --clean --no-install` | with plugin enabled | **present** | Idempotent — plugin patches still apply (marker comment guards the Podfile splice; NODE_OPTIONS line preserved in `.xcode.env.local`) |

So the broken state was **transient** — `expo prebuild --clean`
recreates the entire `ios/Trazia/` folder deterministically. The plugin
does not destroy it.

**Most likely cause (scenario C):** between the previous successful
prebuild and the broken xcodebuild attempt, *something* removed
`ios/Trazia/` from disk. Candidates that can't be definitively
distinguished after the fact:

- An interrupted prebuild (Ctrl-C between "clearing ios" and "creating
  native directories") would leave the project in exactly this shape
  (xcodeproj present, sources missing). The prebuild logs only print
  "Cleared android, ios code" before recreating, so a SIGINT in the
  microseconds between those steps is possible.
- A `git clean -fdx` or `rm -rf ios/Trazia` issued manually.
- Xcode's "remove references — move to trash" on a project group.

Without strace-equivalent telemetry, we can't pin down which one
happened. What matters is that **the script's existing `expo prebuild
--clean` step recovers the state every time** — there is no permanent
corruption.

## Phase 3 — Repair + guardrail

### Immediate fix

Just re-running `npx expo prebuild --clean` brings the directory back.
No data was lost (all sources are templated by Expo + the plugin), so
this is genuinely a one-command recovery.

### Permanent guardrail

`scripts/build-testflight.sh` now asserts that the regenerated
`ios/Trazia/AppDelegate.swift` exists after step 4 (prebuild) and aborts
with an explicit error if not. If a future prebuild ever silently
produces an incomplete tree, the script fails before `pod install` and
xcodebuild can spend half an hour producing confusing downstream
errors.

The plugin is not the culprit, so no plugin change is needed. The
build script's pipeline already has the right step (`expo prebuild
--clean` → pod install → archive), and the added assertion makes
"missing native sources" loud instead of silent.

## Phase 4 — Verification

After re-running prebuild + the script's dry-run:

```
$ ls ios/Trazia | wc -l       # 8 entries, matching the pbxproj refs
$ ./scripts/build-testflight.sh --dry-run --dirty --no-upload --skip-checks
▶ npx expo prebuild --clean
▶ (cd ios && pod install)
▶ xcodebuild … archive
▶ xcodebuild -exportArchive …
▶ Skipping upload (--no-upload). Artifact: build/Trazia-export/Trazia.ipa
```

And a real archive build runs to completion without "file not found".
See the verification section in this doc for the recorded output.
