#!/usr/bin/env bash
#
# Trazia: one-command TestFlight build + upload.
#
# Pipeline:
#   1. dirty-check (override with --dirty)
#   2. typecheck + lint + test (skip with --skip-checks)
#   3. expo prebuild --clean    (plugins/with-trazia-build.js re-applies
#                                Podfile + xcode.env.local + pbxproj patches)
#   4. cd ios && pod install
#   5. xcodebuild archive (Release, generic/platform=iOS, NODE_OPTIONS pinned)
#   6. xcodebuild -exportArchive (uses scripts/build/ExportOptions.plist)
#   7. xcrun altool --upload-app  (App Store Connect via @keychain:AC_PASSWORD)
#
# Flags:
#   --dirty       allow uncommitted changes
#   --dry-run     print every command, perform git/keychain checks, exit
#                 before any prebuild/build/upload runs
#   --skip-checks skip typecheck/lint/test
#   --no-upload   archive + export, but stop short of altool upload
#   --help        usage
#
# First-time keychain setup (run once on this Mac):
#   xcrun altool --store-password-in-keychain-item AC_PASSWORD \
#     -u tim.hobrlant@gmail.com -p <app-specific-password>
#
# Generate the app-specific password at https://appleid.apple.com/account/manage
# under Sign-In and Security → App-Specific Passwords.

set -euo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &>/dev/null && pwd)"
cd "$APP_DIR"

# Keep in sync with plugins/with-trazia-build.js and scripts/build/ExportOptions.plist.
SCHEME="Trazia"
WORKSPACE="ios/Trazia.xcworkspace"
ARCHIVE_PATH="build/Trazia.xcarchive"
EXPORT_DIR="build/Trazia-export"
EXPORT_PLIST="scripts/build/ExportOptions.plist"
IPA_NAME="${SCHEME}.ipa"
NODE_OPTIONS_VALUE="--max-old-space-size=8192"
APPLE_ID="tim.hobrlant@gmail.com"
KEYCHAIN_ITEM="AC_PASSWORD"

ALLOW_DIRTY=false
DRY_RUN=false
SKIP_CHECKS=false
NO_UPLOAD=false

usage() {
  sed -n '3,32p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dirty)       ALLOW_DIRTY=true; shift ;;
    --dry-run)     DRY_RUN=true; shift ;;
    --skip-checks) SKIP_CHECKS=true; shift ;;
    --no-upload)   NO_UPLOAD=true; shift ;;
    -h|--help)     usage ;;
    *)             echo "Unknown flag: $1" >&2; usage ;;
  esac
done

log() {
  printf '\033[1;34m▶\033[0m %s\n' "$*"
}

run() {
  log "$*"
  if [[ "$DRY_RUN" == "true" ]]; then return 0; fi
  eval "$@"
}

fail() {
  printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2
  exit 1
}

# ---------------------------------------------------------------- preflight

if ! command -v xcodebuild >/dev/null; then
  fail "xcodebuild not in PATH — install Xcode and run 'sudo xcode-select -s /Applications/Xcode.app/Contents/Developer'"
fi

if ! command -v xcrun >/dev/null; then
  fail "xcrun not in PATH — Xcode command-line tools missing"
fi

if ! command -v pod >/dev/null; then
  fail "CocoaPods 'pod' command not in PATH — install with 'sudo gem install cocoapods'"
fi

# Confirm an App Store Connect credential exists in the keychain. We don't
# print it; we just check that altool can resolve it. If the keychain item
# is missing, instruct the user how to create it and bail.
if [[ "$NO_UPLOAD" == "false" ]]; then
  if ! security find-generic-password -s "$KEYCHAIN_ITEM" >/dev/null 2>&1; then
    cat <<EOF >&2
✗ Missing keychain item "$KEYCHAIN_ITEM".

Run this once to set it up (after generating an App-Specific Password at
https://appleid.apple.com/account/manage):

    xcrun altool --store-password-in-keychain-item $KEYCHAIN_ITEM \\
      -u $APPLE_ID -p <app-specific-password>

Or pass --no-upload to archive + export without uploading.
EOF
    exit 1
  fi
fi

# ---------------------------------------------------------------- dirty check

if [[ "$ALLOW_DIRTY" == "false" ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    fail "Working tree is dirty. Commit or stash first, or pass --dirty."
  fi
fi

# ---------------------------------------------------------------- quality gates

if [[ "$SKIP_CHECKS" == "false" ]]; then
  run "npm run typecheck"
  run "npm run lint"
  run "npm test"
fi

# ---------------------------------------------------------------- prebuild

run "npx expo prebuild --clean"

# Guardrail: a previous build session ended up with ios/Trazia.xcodeproj
# present but ios/Trazia/ (AppDelegate.swift, Info.plist, …) missing, so
# xcodebuild reported "file not found" deep in the archive step. Catch
# that transient state here — it's much cheaper to abort before pod
# install than to debug a 20-minute archive failure. See
# docs/diagnostics/trazia-inventory.md for the post-mortem.
if [[ "$DRY_RUN" == "false" ]] && [[ ! -f ios/Trazia/AppDelegate.swift ]]; then
  fail "prebuild left ios/Trazia/ incomplete (no AppDelegate.swift). Re-run the script or 'npx expo prebuild --clean' manually."
fi

# ---------------------------------------------------------------- pods

run "(cd ios && pod install)"

# ---------------------------------------------------------------- archive

rm -rf "$ARCHIVE_PATH" "$EXPORT_DIR"
mkdir -p "$(dirname "$ARCHIVE_PATH")"

# `NODE_OPTIONS` is also injected into ios/.xcode.env.local by the config
# plugin, but exporting it here too means an `archive` invoked without the
# bundle phase reading that file (e.g. CocoaPods scripts shelled out to
# node) still gets the larger heap.
export NODE_OPTIONS="$NODE_OPTIONS_VALUE"

run "xcodebuild \
  -workspace $WORKSPACE \
  -scheme $SCHEME \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath $ARCHIVE_PATH \
  -allowProvisioningUpdates \
  archive | xcpretty 2>/dev/null || \
xcodebuild \
  -workspace $WORKSPACE \
  -scheme $SCHEME \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath $ARCHIVE_PATH \
  -allowProvisioningUpdates \
  archive"

# ---------------------------------------------------------------- export

run "xcodebuild \
  -exportArchive \
  -archivePath $ARCHIVE_PATH \
  -exportPath $EXPORT_DIR \
  -exportOptionsPlist $EXPORT_PLIST \
  -allowProvisioningUpdates"

IPA_PATH="$EXPORT_DIR/$IPA_NAME"
if [[ "$DRY_RUN" == "false" ]] && [[ ! -f "$IPA_PATH" ]]; then
  fail "Export finished but $IPA_PATH does not exist — check $EXPORT_DIR for the actual artifact name."
fi

# ---------------------------------------------------------------- upload

if [[ "$NO_UPLOAD" == "true" ]]; then
  log "Skipping upload (--no-upload). Artifact: $IPA_PATH"
  exit 0
fi

run "xcrun altool --upload-app \
  -t ios \
  -f $IPA_PATH \
  -u $APPLE_ID \
  -p @keychain:$KEYCHAIN_ITEM"

log "TestFlight upload submitted. Processing typically takes 5–15 minutes; you'll receive an email when the build is ready to release in App Store Connect."
