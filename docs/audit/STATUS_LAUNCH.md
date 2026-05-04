# Phase-1 Launch-Fix-Session — Status

Stand: 2026-05-04 (laufend)

## Block-Status

| Block | Beschreibung | Status |
|---|---|---|
| 0 | Smoke-Check + Reproduction-Tests | ✅ |
| 1 | SQL-0002 conflict-safe + Sentry-Conflict-Logging | ✅ |
| 2 | durationMinutes in FlightForm/TrainForm/OtherForm | ✅ |
| 3 | Achievement-Mode-Isolation via appliesTo | ✅ |
| 4 | Backup-Restore transaction-safe | ✅ |
| 5 | Phase-1 Train-Gating | ✅ |
| 6 | Metro `.sql`-Bundling | ✅ |
| 7 | Privacy-Policy-Disclosure | ✅ |
| 8 | Final Validation | ✅ |
| 9 | Codex-Final-Review-Cleanup | ✅ |

## Final Validation Result (2026-05-04)

- npm test: 193 / 193 grün
- npx tsc --noEmit: 0 Errors
- npm run lint: 0 Errors
- expo-doctor: 17 / 17
- Build-Smoke: `npx expo export --platform ios` läuft sauber durch
  (10.7 MB Hermes-Bundle, 15 MB total).
- Alle 4 Reproduction-Tests aus
  `src/__tests__/launch-blockers.test.ts` (+ 1 Idempotenz-Test) grün.

## Notes

- Train-Code im Repo, aber via `FEATURE_FLAGS.PHASE_2_TRAIN_VISIBLE`
  deaktiviert. Re-Aktivierung post-launch: Flag auf `true` + neuer
  EAS-Build (siehe `src/config/featureFlags.ts`).
- Edit-Screen für vorhandene Train-Reisen: aktuell weiter editierbar
  (TrainForm bleibt im Bundle). Tims eigene Test-Daten bleiben damit
  voll bearbeitbar — wenn UX-seitig später read-only erwartet wird,
  ist das ein eigener Block.
- Stats-Modi-Verteilung zeigt bei nur Flügen den Donut nicht mehr,
  sondern die Zeile "100% Flugreisen".
- AdMob-IDs als TODO offen — Block 7 dokumentiert das in
  `RELEASE_CHECKLIST.md`.

## Codex Final Review (2026-05-04)

7 LAUNCH-Blocker geprüft, alle bestätigt: 5 OK, 2 TEILWEISE
(Duration-Test indirekt, validateSnapshot unvollständig). Cleanup-
Session am 2026-05-04 hat beide Punkte gefixt:

- **Punkt 1** — Patch-Bau für Flight/Train/Other extrahiert nach
  `src/lib/journeys/buildJourneyPatch.ts`. Forms importieren die
  Helper, Tests importieren sie auch — Form und Test können nicht
  mehr stillschweigend auseinanderdriften. (commit 8164941)
- **Punkt 2** — `validateSnapshot` prüft jetzt Row-Pflichtfelder per
  Tabelle, FK auf `parentJourneyId` (inkl. Self-Reference) und FK auf
  `achievementUnlocks.triggeringJourneyId`. Pre-Validation fängt damit
  alles ab, was die Transaction sonst mid-restore aufdeckt. (commit
  ed8cad6)
- **Punkt 3** — diese Tabellen-Bereinigung.

## Vor Production-Submit manuell durch Tim

Nichts code-seitiges mehr offen — die folgenden Punkte sind reine
Account- / Hosting- / Submit-Aufgaben, die kein Code-Diff lösen kann:

- [ ] AdMob Production-App-IDs + Unit-IDs in `app.json` und als
      EAS-Secrets setzen (`src/lib/ads/units.ts` hat den
      BLOCKING-Hinweis). Ohne reale IDs werden in der Release-Build
      keine Ads ausgeliefert.
- [ ] Apple Team ID + ASC App ID in `eas.json` finalisieren
      (für `eas submit`).
- [ ] Sentry Org / Project / DSN / Auth-Token finalisieren
      (Sourcemap-Upload via EAS-Secret).
- [ ] `trazia.com/privacy` mit beiden Sprachen (DE + EN) hosten —
      Quelle: `docs/privacy-policy-{de,en}.md`.
- [ ] Datenschutzerklärungs-URL im App-Store / Play-Store Listing
      eintragen.
- [ ] App Privacy Details auf App Store Connect manuell ausfüllen
      (Sentry, PostHog, AdMob, RevenueCat alle deklarieren — siehe
      `docs/privacy-policy-de.md`).
- [ ] Manuelles Test-Drehbuch S1-S7 + S10-S14 auf echtem Gerät
      durchspielen, Findings in `docs/audit/manual-test-findings.md`
      sammeln. S8/S9 (Train) skippen — Phase-1 versteckt.
