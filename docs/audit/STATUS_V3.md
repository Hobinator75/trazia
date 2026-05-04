# STATUS_V3 — Codex v3 Cleanup Session

Stand: 2026-05-04 nach Abschluss der V3-Fix-Session.

## TL;DR

Alle vier P1-Items aus `docs/audit/codex/v3/HANDOFF_TO_CC_V3.md` sind
gefixt, dazu die zwei wichtigen P2-Items (Submit-Atomarität,
Theme-Ehrlichkeit). P3-Items bleiben für nach Launch. Toolchain
komplett grün, expo-doctor 17/17, iOS-Export-Smoke 15 MB.

## Was wurde gefixt

### Block 1 — Phase-1 Mode-Sichtbarkeit (P1)

Commit: `784c3af fix(v3): Phase-1 zeigt nur Flight + Other in der UI`

- `ALL_MODES` (vollständig) und `PHASE_1_VISIBLE_MODES` (nur Flight +
  Other) sauber getrennt. `MODES`-Alias zeigt auf die Phase-1-Liste.
- `app/onboarding/modes.tsx` rendert keine locked Auto/Schiff/Bus-
  Tiles mehr. Nur Flight + Other.
- `ModePicker` zeigt keine Locked-Tile-Teaser mehr.
- Bestehende Train-Reisen sind weiterhin via Edit-Screen editierbar
  (Repository-Test bestätigt).
- Stats-Mode-Pie über `computeModePieData` jetzt pure und testbar mit
  Tests für flight-only, flight+other, flight+other+train (alte Daten),
  walk/bike → other.

### Block 2 — Settings-Persistenz (P1)

Commit: `b2fcb89 fix(v3): settings-store persistiert via AsyncStorage`

- `zustand persist` mit `createJSONStorage(() => AsyncStorage)`,
  `name: 'trazia-settings'`, `version: 1`, mit migrate-Stub für
  zukünftige Schema-Bumps.
- `partialize` wählt nur die persistierbaren Felder
  (theme, distanceUnit, soundEnabled, notificationsEnabled,
  crashReportsEnabled, analyticsEnabled, profileName, avatarUri).
- Reproduction-Test
  `src/stores/__tests__/settings-persistence.test.ts` mit 5 Cases:
  Crash-Opt-out überlebt Re-Import, Analytics-Opt-In persistiert,
  theme/unit/sound persistieren, Defaults stimmen, Sentry beforeSend
  liest Live-Wert (kein Boot-Snapshot).

### Block 3 — In-App-Privacy-Copy (P1)

Commit: `bd7f826 fix(v3): In-App Privacy Copy mit Sentry/PostHog/AdMob/RevenueCat`

- `src/lib/legal/content.ts` an `docs/privacy-policy-de.md` angeglichen.
- Sentry- und PostHog-Sektionen explizit mit Zweck, Datenkategorien,
  Hosting (EU), Default-State und Opt-out-Pfad.
- ATT/IDFA-Stance klar formuliert (kein Cross-App-Tracking aktuell).
- Daten-Export-/-Lösch-Pfade nennen den tatsächlichen Menüpfad.
- Smoke-Test in `src/lib/legal/__tests__/content.test.ts`.

### Block 4 — Production-Konfig + Format (P1)

Commits:
- `7c93313 fix(v3): production hard-fail bei fehlenden AdMob-IDs + eas.json TODO-Markierung`
- `8baf507 chore(v3): prettier --write über das gesamte Repo`

- `src/lib/ads/units.ts` wirft im Modul-Load eine sprechende Fehler-
  meldung, wenn `EXPO_PUBLIC_ENV=production` ohne echte Unit-IDs
  importiert wird.
- `eas.json` setzt `ascAppId` und `appleTeamId` auf
  `REPLACE_WITH_*_BEFORE_FIRST_SUBMIT`-Sentinels.
- `prettier --write` über das gesamte Repo gelaufen, separater
  Format-Commit damit der Diff lesbar bleibt.
- 4 neue Tests in `src/lib/ads/__tests__/units.test.ts`.

### Block 5 — Submit-Atomarität (P2)

Commit: `3688aef fix(v3): journey-save atomar via saveJourneyWithExtras`

- Neue Repository-Funktion
  `saveJourneyWithExtras(db, patch, extras, opts)` bündelt
  Journey-Insert/Update plus Tags/Photos/Companions in einer einzigen
  SQLite-Transaction (BEGIN/COMMIT/ROLLBACK manuell, gleiches Muster
  wie `restoreFromSnapshot`).
- FlightForm/TrainForm/OtherForm konsumieren die neue Funktion.
  Snackbar-Text bei Fehler nennt explizit "deine Änderungen sind
  unverändert".
- Achievement-Recalc und Ad-Trigger laufen bewusst nach erfolgreichem
  COMMIT (Option A) — die haben eigene idempotente Persistenz.
- 5 Reproduction-Tests in `src/db/__tests__/journey-atomic-write.test.ts`
  (Create-Rollback, Edit-Rollback, Edit-Happy-Path, FK-Rollback) waren
  rot vor dem Refactor und sind jetzt grün.

### Block 6 — Theme dark-only (P2)

Commit: `1e18df9 fix(v3): dark-only für Phase 1, theme-toggle entfernt aus UI`

- `app/_layout.tsx`: Navigation-Theme hardcoded auf `DarkTheme`,
  StatusBar `style="light"`.
- `app/(tabs)/profile/index.tsx`: Theme-Auswahl-SegmentedRow durch
  statische Info-Card ersetzt mit "Light Mode kommt in einem späteren
  Update."
- Settings-Store behält `theme`/`setTheme` für Phase-2-Compat.
  `useThemeBinding` bleibt im Code.

## Was ist offen (P3-Backlog)

Nicht in dieser Session angefasst, weil nicht launchblocking:

- **`bezierPath()` über IDL korrigieren** — `src/lib/geo/index.ts:122`.
  Aktuell nicht im Flugpfad genutzt (Flüge zeichnen Great-Circle), kein
  user-sichtbarer Bug. Test NRT-LAX/IDL fehlt.
- **A11y-Labels/Roles** für ModePicker, SelectButton, Icon-Buttons,
  Toast, Modals. Wichtig für Screenreader-Support, aber kein
  Submit-Blocker.
- **Map/Globe-Last** mit 500+ Journeys auf Device messen. Aktuell nur
  Memo-Pfad ohne empirische Last-Messung.
- **Seed-Fast-Path FK-Sicherheit** für Bestandsuser. Aktuell fällt der
  Pfad bei FK-Konflikt auf JSON zurück, also degradiert sicher; nicht
  blockend.

## Was muss Tim manuell vor Submit machen

Aus `RELEASE_CHECKLIST.md` → "Hard-Stops vor erstem Production-Build":

1. **AdMob-Production-IDs in EAS Secrets** setzen
   (`EXPO_PUBLIC_ADMOB_*_UNIT_ID_*`) und `app.json:plugins.
   react-native-google-mobile-ads.{ios,android}AppId` durch echte
   Werte ersetzen. Production-Build fail-fast wenn nicht gesetzt.
2. **eas.json: `ascAppId` und `appleTeamId`** durch echte Werte
   ersetzen (aktuell `REPLACE_WITH_*_BEFORE_FIRST_SUBMIT`-Sentinels).
3. **Sentry**: Org/Project bei sentry.io anlegen,
   `EXPO_PUBLIC_SENTRY_DSN` und `SENTRY_AUTH_TOKEN` als EAS-Secrets
   hinterlegen.
4. **Privacy-Policy auf trazia.com hosten** und URL in App Store
   Connect eintragen. Beide Sprachen aus `docs/privacy-policy-{de,en}.md`.
5. **App-Privacy-Details auf App Store Connect** eintragen — Daten-
   kategorien und Drittanbieter müssen mit der gehosteten Privacy-
   Policy übereinstimmen.
6. **Privacy-Manifests aller SDKs** nach erstem EAS-Build via
   Xcode → Privacy Report Tool prüfen.

## Toolchain-Status (Stand 2026-05-04, nach allen V3-Fix-Commits)

```
typecheck     : 0 errors
lint          : 0 errors  (expo lint)
format:check  : 0 errors  (prettier --check)
tests         : 31 files / 247 tests passing
expo-doctor   : 17/17 checks passing
expo export   : iOS bundle 15 MB (10.7 MB JS) — under 50 MB threshold
```

## Empfehlung

Nach diesem Audit-Pass spricht aus dem Code nichts gegen einen
**TestFlight-/Internal-Track-Build**. Empfohlene Reihenfolge:

1. Tim erledigt die manuellen Items oben (AdMob, Apple, Sentry,
   Privacy-Policy-Hosting).
2. Test-Drehbuch nur für Phase-1-User-Flows: Onboarding,
   Add Flight, Add Other, Edit Flight, Delete Flight,
   Edit Train (Bestandsdaten), Backup/Restore, Paywall/Ads/Consent,
   Achievements, Settings-Persistenz über App-Neustart.
3. Erster `eas build --profile preview` (TestFlight) erst nach
   Punkt 1 + 2.
4. Production-Build erst nach echten Store-/Ad-/Privacy-Daten.
