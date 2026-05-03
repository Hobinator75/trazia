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
| 6 | Metro `.sql`-Bundling | offen |
| 7 | Privacy-Policy-Disclosure | offen |
| 8 | Final Validation | ✅ |

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

## Manuelle Tim-Reviews offen

- [ ] App Privacy Details auf App Store Connect manuell eintragen
      (siehe `docs/privacy-policy-de.md` — Sentry, PostHog, AdMob,
      RevenueCat müssen alle deklariert sein).
- [ ] `trazia.com/privacy` mit beiden Sprachen (DE + EN) hosten —
      Quelle: `docs/privacy-policy-{de,en}.md`.
- [ ] Datenschutzerklärungs-URL im App-Store / Play-Store Listing
      eintragen.
- [ ] AdMob Production-IDs in `app.json` und EAS-Secrets setzen
      (`src/lib/ads/units.ts` hat den BLOCKING-Hinweis).
- [ ] Manuelle Test-Drehbuch S1-S7 + S10-S14 auf echtem Gerät spielen,
      Findings in `docs/audit/manual-test-findings.md` sammeln.
      S8/S9 (Train) skippen — Phase-1 versteckt.
