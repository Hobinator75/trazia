# Codex Cross-Audit v2 - Summary

Read-only Cross-Audit gegen Claude Codes Fix-Sessions. Reports liegen in `docs/audit/codex/30_fix_validation.md` bis `38_release_readiness.md`.

## A: Wo Claude Code recht hatte

- Die Seed-Daten sind real und grob plausibel: 3308 Airports, 993 Airlines, 147 Aircraft; FRA/JFK/NRT/ZRH/SIN/AKL-Koordinaten stimmen in der Stichprobe.
- Der Achievement-Catalog hat formal 32 Flight- und 18 Train-Achievements; alle `rule.type`s sind im Engine-Switch bekannt.
- Die Code-Migration fuer Achievement-ID-Renames ist in Isolation idempotent und transaktional (`src/lib/achievements/migration.ts:111-184`).
- Der pre-built SQLite Seed-Fast-Path existiert und hat einen sinnvollen JSON-Fallback (`src/hooks/useDbSeed.ts:33-54`).
- Die 124 Train-Stations sind als Post-Launch-Datenluecke dokumentiert (`RELEASE_CHECKLIST.md:24-27`), also kein Phase-1-Launch-Blocker, solange Zug wirklich versteckt wird.
- STATUS_OPTs Metro-`.sql`-Bundle-Blocker ist plausibel: `.sql` wird als Source importiert (`src/db/migrations/migrations.js:3-7`), aber kein Transformer ist konfiguriert (`metro.config.js:6`, `babel.config.js:1-6`).

## B: Wo Claude Code falsch lag oder Bugs uebersehen hat

| Punkt | Warum CCs Bewertung zu optimistisch ist | Code-Referenz | Severity |
|---|---|---|---:|
| Achievement-ID-Migration | Der idempotente Code laeuft erst nach erfolgreicher Drizzle-Migration. SQL 0002 kann bei Doppel-Unlock vorher am Unique-Index crashen. | `src/db/migrations/0002_achievement_id_migration.sql:11-12`, `src/hooks/useDbReady.ts:13-17`, `src/db/schema.ts:193-207` | `[LAUNCH]` |
| Duration-Achievements | Engine erwartet `durationMinutes`, aber Forms schreiben es nie. Tests setzen den Wert manuell und maskieren den Bug. | `src/lib/achievements/engine.ts:134-141`, `FlightForm.tsx:185-202`, `TrainForm.tsx:180-197`, `journey.repository.test.ts:86-100` | `[LAUNCH]` |
| Mode-Isolation | 29 non-cross Achievements haben kein `rule.mode`; Engine ignoriert `appliesTo` fuer Geo/Operator/Vehicle/Cabin. | `src/lib/achievements/engine.ts:144-155`, `188-217`, `231-251`, `298-300` | `[LAUNCH]` + `[POST-LAUNCH]` |
| Seed-DB Upgrade | Fast-Path loescht System-Locations trotz Journey-FKs mit `onDelete: restrict`; echter Existing-user-Path faellt zurueck oder scheitert. | `src/db/seed/loadFromSeedDb.ts:73-75`, `src/db/schema.ts:92-97`, `seedDb.test.ts:207-253` | `[LAUNCH]` |
| Sentry-Conflict-Logging | Conflicts ohne `result.error` werden nicht capturet, obwohl Checklist Conflict-Reports erwartet. | `src/hooks/useAchievementMigrations.ts:35-45`, `RELEASE_CHECKLIST.md:53-54` | `[LAUNCH]` |
| Backup Restore | Restore wischt Daten ohne Transaction; ein Mid-Insert-Fehler kann User-Daten loeschen. | `src/lib/backup/index.ts:97-123` | `[LAUNCH]` |
| Privacy/Release | Privacy-Policy nennt Sentry/PostHog nicht, obwohl Code sie initialisiert. AdMob ist noch auf Test-IDs. | `docs/privacy-policy-de.md:15-27`, `app/_layout.tsx:33-41`, `app.json:79-83`, `src/lib/ads/units.ts:9-14` | `[LAUNCH]` |
| Train Gating | Code hat Zug aktuell sichtbar, obwohl Phase-1-only Launch geplant ist. | `src/components/domain/ModePicker.tsx:16-23`, `app/onboarding/modes.tsx:18-24`, `app/(tabs)/journeys/add.tsx:21-27` | `[LAUNCH]` Gate |

## C: Eigene Top-3 kritische Funde, die CC nicht hatte

1. `[LAUNCH]` SQL-0002 kann den App-Start fuer Doppel-Unlock-User blockieren, bevor die idempotente Code-Migration greifen kann.
2. `[LAUNCH]` Long-haul/Duration-Achievements unlocken im normalen FlightForm-Pfad nicht, weil `durationMinutes` nie berechnet/gespeichert wird.
3. `[LAUNCH]` `restoreFromBackup` ist destructive ohne Transaction; ein kaputtes Backup oder Mid-restore-Fehler kann lokale Daten verlieren.

Knapp dahinter: Mode-Isolation der Achievement-Engine und Seed-DB-Fast-Path mit FK-referenzierten System-Locations.

## D: Aktualisierte Empfehlung

Phase-1-Launch jetzt: **noch eine Bugfix-Runde vor Production-Submit**.

Echte Phase-1-Launch-Blocker:

- SQL-0002 conflict-safe machen oder entfernen, damit Achievement-ID-Migrationen App-Start nicht blockieren.
- `durationMinutes` in FlightForm/Repository berechnen oder Duration-Achievements deaktivieren.
- Train im Release-Branch wirklich verstecken.
- Metro-`.sql`-Bundling fixen.
- AdMob Production IDs / EAS Secrets setzen.
- Privacy-Policy/App-Privacy fuer Sentry/PostHog/Ads finalisieren oder betroffene SDKs deaktivieren.
- `restoreFromBackup` transaktional absichern, falls Restore im Launch-UI sichtbar ist.

Post-Launch-Backlog fuer Phase 8.1 Zug:

- Bahnhofskatalog von 124 auf geplanten Umfang ausbauen.
- TrainForm Overnight/Duration richtig modellieren.
- Train-Achievements mode-isolieren; `DB` Code-Kollision loesen.
- `transalpine` klaeren, falls weiterhin Spec-Erwartung.

Polish:

- Light Theme nicht nur im Store, sondern in Komponenten sauber umsetzen.
- Accessibility Labels/Roles fuer Form Controls, Modals und Icon Buttons.
- iPad-Layout ehrlich testen oder `supportsTablet`/Portrait-Erwartung bewusst deklarieren.

Empfohlene Reihenfolge:

1. Migration 0002 safe machen.
2. Duration-Berechnung + Achievement-Mode-Isolation.
3. Train-Gating fuer Phase 1.
4. Restore-Transaction.
5. Metro/AdMob/Privacy Release-Fixes.
6. Seed-FK-Upgrade-Test und spaeter Fast-Path-Upsert statt Delete/Reinsert.

## E: Vergleich mit STATUS_OPT.md

- Metro-`.sql`-Blocker: **stimmt**. Die lokale Config bestaetigt STATUS_OPT.
- Achievement-Migration-Idempotenz: **nur halb richtig**. Code-Migration ist idempotent, aber SQL 0002 kann vorher crashen.
- Pre-built SQLite: **fresh-install wahrscheinlich ok**, aber STATUS_OPT ist zu optimistisch fuer echte Existing-user-Upgrades mit Journey-FKs.
- Offene Items in `00_summary.md`: **nicht vollstaendig**. Es fehlen vor allem Duration-Form-Pfad, Mode-Isolation, Restore-Transaction, Sentry-Conflict-Logging und Privacy-Policy-Luecke fuer Sentry/PostHog.

