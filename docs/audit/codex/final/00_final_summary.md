# Codex Final Review - Summary

Stand: 2026-05-04. Ergebnis der gezielten Schlussprüfung: keine kaputten Fixes, aber zwei nur teilweise erfüllte Audit-Kriterien.

## 1. Status der 7 LAUNCH-Blocker

| Blocker | Verdict | Notiz |
|---|---|---|
| SQL-0002 conflict-safe | OK | SQL ist No-op; Code-Migration und Sentry-Conflict-Reporting sind vorhanden. |
| durationMinutes in Forms | TEILWEISE | Flight/Train/Other berechnen `durationMinutes`; Test ist aber kein echter Form-Submit-Pfad. |
| Achievement Mode-Isolation | OK | `appliesTo` filtert vor Rule-Auswertung; Bugcases sind getestet. |
| Backup-Restore transactional | TEILWEISE | Restore ist transaktional und rollback-sicher; Pre-Validation prüft nicht alle FKs/Pflichtfelder. |
| Train-Gating Phase 1 | OK | Train ist fuer neue Phase-1-Entry-Points gesperrt/versteckt; bestehende Train-Journeys crashen nicht. |
| Metro `.sql`-Bundling | OK | Migrationen werden als generierte TS-Strings gebundled; Build-Smoke ist dokumentiert. |
| Privacy/AdMob Disclosure | OK | Sentry/PostHog/AdMob/RevenueCat sind dokumentiert; AdMob-Test-IDs sind Production-Hard-Stop. |

## 2. Regressionen

- Keine neue Runtime-Regression in den Stichproben gefunden.
- `STATUS_LAUNCH.md` ist in der Block-Tabelle stale fuer Block 6/7, obwohl die Details darunter den finalen Stand nennen.
- Seed-Fast-Path Existing-user-FK-Risiko ist unverändert, aber nicht durch die Fixes neu eingeführt.

## 3. Was Codex weiter beobachtet hätte

- 124 Bahnhöfe: weiterhin valide Post-Launch-Datenlücke (`assets/static/train_stations.json` hat 124 Einträge).
- Train Overnight: Form-Duration ist jetzt auch fuer Train gefixt; offen bleibt UX/Timezone-Semantik und ein dediziertes `night_train`-Achievement existiert weiter nicht.
- Train Mode-Isolation: Engine-seitig gefixt; später bei Phase-2-Train mit echten Bahn-Daten erneut mit realen Katalogprofilen prüfen.
- `transalpine`: weiterhin nicht im Catalog gefunden; bleibt Spec-Klärung.
- Seed-FK Existing-User: weiterhin valide; `loadFromSeedDb.ts` löscht System-Seeds und verlässt sich auf Rollback/Fallback.
- Neu sichtbar: Duration-Test sollte auf echten Form-Pfad gehoben werden; Restore-Prevalidation sollte alle FKs/Pflichtfelder prüfen oder bewusst als transaction-only guard dokumentiert werden.

## 4. Empfehlung

**PHASE-1-LAUNCH BEREIT: nein, nach Codex-Gate noch nicht ganz.**

Was konkret fehlt:

- Echten Form-Submit-Regressionstest fuer `durationMinutes` ergänzen, mindestens FlightForm, besser Flight/Train/Other.
- `validateSnapshot` vollständig machen fuer row-level Pflichtfelder und alle FK-Refs (`parentJourneyId`, `achievementUnlocks.triggeringJourneyId`) oder die Pre-Validation-Behauptung entsprechend abschwächen.
- `STATUS_LAUNCH.md` Block-Tabelle fuer 6/7 aktualisieren.

Vor Store-Submit muss Tim außerdem manuell erledigen: AdMob Production-IDs/App-IDs setzen, Apple Team ID / ASC App ID eintragen, Privacy Policy DE/EN hosten, App Store Connect Privacy Details ausfüllen, Sentry-Org/Project/DSN und Source-Map-Secret finalisieren.

## 5. Verbleibendes Risiko

Das größte Nach-Launch-Risiko bleibt der Seed-Fast-Path fuer Existing Users mit Journey-FKs auf alte System-Locations: Datenverlust ist durch Rollback/Fallback unwahrscheinlich, aber Upgrades können langsam oder inkonsistent werden.
