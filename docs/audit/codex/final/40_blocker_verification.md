# Codex Final Review - Blocker Verification

Stand: 2026-05-04. Scope: gezielte Verifikation der 7 Codex-LAUNCH-Blocker aus `docs/audit/codex/00_codex_summary.md`, kein Vollaudit.

## Fix-Commits

Die letzten Commits enthalten die erwarteten Launch-Fixes:

- `64eb9e9 fix(launch): SQL-0002 conflict-safe + Sentry-Conflict-Logging`
- `e4f5119 fix(launch): durationMinutes in Forms berechnen`
- `4f9cee3 fix(launch): Achievement-Mode-Isolation via appliesTo-Filter`
- `22747e2 fix(launch): backup-restore transaktional + Pre-Validation`
- `63d879c fix(launch): Phase-1 Train-Gating via FEATURE_FLAGS`
- `e9fc27e fix(launch): metro .sql bundling resolved`
- `614b819 fix(launch): privacy-policy with Sentry/PostHog disclosure`

## Ergebnis

| Blocker | Verdict | Befund |
|---|---|---|
| A1 SQL-0002 conflict-safe | OK | SQL 0002 ist No-op statt Blind-Update (`src/db/migrations/0002_achievement_id_migration.sql:1`). Code-Migration erkennt Doppel-Unlock-Konflikte und skippt ohne Crash (`src/lib/achievements/migration.ts:127`). Konflikte gehen als Sentry-Warning raus (`src/lib/achievements/reportMigration.ts:33`), Hook ruft Reporting auf (`src/hooks/useAchievementMigrations.ts:36`). Tests: SQL-Doppel-Unlock (`src/__tests__/launch-blockers.test.ts:42`), Code-Konflikt (`src/lib/achievements/__tests__/migration.test.ts:99`), Sentry-Conflict-Report (`src/lib/achievements/__tests__/reportMigration.test.ts:41`). |
| A2 durationMinutes in Forms | TEILWEISE | Runtime-Code ist gefixt: Helper behandelt Overnight (`src/lib/journeys/duration.ts:20`), `00:00 -> 00:00` ist explizit 0 (`src/lib/journeys/__tests__/duration.test.ts:22`), Flight/Train/Other schreiben `durationMinutes` (`FlightForm.tsx:186`, `TrainForm.tsx:181`, `OtherForm.tsx:174`). Aber der neue Form-Test mountet keinen echten Form-Submit und importiert keine Produktions-Patch-Funktion; er dupliziert die Patch-Logik im Test (`src/components/domain/AddJourney/__tests__/flightForm-duration.test.ts:21`). Das ist besser als ein isolierter Helper-Test, aber nicht der geforderte reale Form-Pfad. Repository-Maskierung ist entfernt (`src/db/__tests__/journey.repository.test.ts:87`). |
| A3 Achievement Mode-Isolation | OK | Engine filtert `ctx.allJourneys` via `achievement.appliesTo` vor Rule-Auswertung (`src/lib/achievements/engine.ts:70`, `src/lib/achievements/engine.ts:86`). Explizite Bugtests existieren fuer Train-first vs Flight-first (`src/lib/achievements/__tests__/engine.test.ts:601`), DB-Code-Kollision (`src/lib/achievements/__tests__/engine.test.ts:617`) und transatlantic ship/flight isolation (`src/lib/achievements/__tests__/engine.test.ts:661`). Catalog erzwingt `appliesTo` (`src/lib/achievements/__tests__/catalog.test.ts:97`). Operator-Suche filtert per Mode in den Form-Callsites (`FlightForm.tsx:510`, `TrainForm.tsx:491`) und im Repository (`src/db/repositories/operator.repository.ts:41`); Test vorhanden (`src/db/__tests__/operator.repository.test.ts:68`). |
| A4 Backup-Restore transactional | TEILWEISE | Destructive Restore ist jetzt in `BEGIN/COMMIT/ROLLBACK` gekapselt (`src/lib/backup/restore.ts:146`). `restoreFromBackup` delegiert auf `restoreFromSnapshot` (`src/lib/backup/index.ts:89`). Tests decken invalid snapshot unchanged (`src/lib/backup/__tests__/restore-transaction.test.ts:170`) und mid-restore rollback (`src/lib/backup/__tests__/restore-transaction.test.ts:185`) ab. Einschränkung: `validateSnapshot` prüft Version, Top-Level-Arrays, Duplikate und viele FKs (`src/lib/backup/restore.ts:42`), aber nicht alle FK-Refs (`parentJourneyId`, `achievementUnlocks.triggeringJourneyId`) und keine row-level Pflichtfelder. Die Transaction verhindert Datenverlust, die Pre-Validation ist aber nicht so vollständig wie behauptet. |
| A5 Train-Gating Phase 1 | OK | Flag ist aus (`src/config/featureFlags.ts:11`). ModePicker zeigt Train locked/disabled (`src/components/domain/modePickerConfig.ts:21`), Onboarding versteckt Train komplett (`app/onboarding/modes.tsx:23`), Add-Journey fällt defensiv auf FlightForm zurück und snackbar-t locked taps (`app/(tabs)/journeys/add.tsx:16`, `app/(tabs)/journeys/add.tsx:24`). Bestehende Train-Journeys bleiben editierbar (`app/(tabs)/journeys/edit/[id].tsx:76`); das ist nicht read-only, aber sinnvolles Nicht-Crash-Verhalten fuer Bestandsdaten. Stats zeigt bei nur Flug-Daten keinen kaputten Single-Slice-Donut (`src/components/domain/Stats/ChartsSection.tsx:111`). |
| A6 Metro `.sql`-Bundling | OK | Lösung nutzt generierte TS-Strings statt `.sql`-Transformer: Generator (`scripts/generate-migration-strings.ts:2`), Runtime-Import (`src/db/migrations/migrations.js:7`), generierte Payloads (`src/db/migrations/sql-strings.ts:1`). `metro.config.js` importiert `.db` als Asset und dokumentiert, dass `.sql` nicht in `sourceExts` liegt (`metro.config.js:9`, `metro.config.js:11`). `STATUS_OPT.md` dokumentiert Build-Smoke mit 10.7 MB Bundle (`docs/audit/STATUS_OPT.md:81`). Kleiner Doku-Fleck: `STATUS_LAUNCH.md:15` markiert Block 6 noch als offen, obwohl darunter Build-Smoke passed steht. |
| A7 Privacy-Policy & AdMob Disclosure | OK | DE/EN Privacy Policy nennen Sentry, PostHog, AdMob, RevenueCat (`docs/privacy-policy-de.md:20`, `docs/privacy-policy-en.md:20`). Release-Checklist markiert AdMob-Test-IDs direkt oben als Production-Hard-Stop (`RELEASE_CHECKLIST.md:5`, `RELEASE_CHECKLIST.md:10`). `app.json` nutzt weiterhin Google-Test-App-IDs (`app.json:81`), was fuer diesen Audit-Stand akzeptiert ist, aber vor Production-Submit manuell ersetzt werden muss. Ad-Unit-Fallbacks sind ebenfalls klar als Test-IDs kommentiert (`src/lib/ads/units.ts:3`). |

## Kurzfazit

Kein Blocker ist kaputt. Zwei Fixes sind nur teilweise verifiziert: Duration hat Runtime-Fix, aber keinen echten Form-Submit-Test; Restore ist datenverlustsicher, aber die Pre-Validation ist nicht vollständig.
