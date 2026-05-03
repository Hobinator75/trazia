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
| 8 | Final Validation | offen |

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

(werden in Block 7 ergänzt)
