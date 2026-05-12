# 17 — Release Readiness

## Verdict

Build-Smoke grün, Store-Submit noch nein.

## Grün

- `npm run typecheck`: grün.
- `npm run lint`: grün.
- `npm run test`: 220/220 grün.
- `npx expo-doctor`: 17/17 grün.
- `npx expo export --platform ios --output-dir /tmp/trazia-expo-export-v3`: grün.
- Temporärer Export: 15 MB gesamt, iOS Hermes bundle 10.7 MB.
- Icons/Splash existieren: `icon.png` 1024, `splash-icon.png` 1024, Android foreground/background 512, monochrome 432, favicon 48.

## Rot / offen

- `npm run format:check` fällt auf 28 Dateien.
- AdMob App IDs in `app.json` sind Google-Test-IDs (`app.json:79`).
- AdMob Unit IDs fallen ohne EAS Secrets auf Test-IDs zurück (`src/lib/ads/units.ts:17`).
- `eas.json` iOS submit hat leere `ascAppId`/`appleTeamId` (`eas.json:64`).
- Sentry Expo plugin hat Org/Project gesetzt, aber DSN/Auth Token/EAS Secret wurden in diesem Audit nicht verifiziert.
- iOS Privacy Manifest muss im echten native build gegen alle SDKs geprüft werden.

## Bewertung

Preview/Internal Build ist möglich. Production Submit erst nach Config/Privacy/Format.

