# Codex Cross-Audit v2 - Test-Quality-Audit

Keine Tests durch Codex ausgefuehrt; read-only Review der Testdateien. STATUS_OPT nennt 152 Tests. Gefunden wurden 17 Testdateien.

## Gesamturteil

Die Suite ist nicht wertlos. Geo, Stats, Repository-Basics, Achievement-Engine und Seed-Fallbacks sind sinnvoll abgedeckt. Aber Claude Code hat an mehreren Stellen "Tests gruen" mit "User-Pfad korrekt" verwechselt. Die wichtigsten Bugs im Cross-Audit waeren von der aktuellen Suite nicht gefunden worden.

## Stichprobe 10 Tests

| Test | Was er gut prueft | Was er nicht prueft | Bewertung |
|---|---|---|---|
| `src/lib/achievements/__tests__/engine.test.ts` | Viele Rule-Types exemplarisch, Geo/Performance vorhanden. | Mode-Isolation fuer `appliesTo` ohne `rule.mode` fehlt. | Gut, aber blinder Fleck |
| `src/lib/achievements/__tests__/catalog.test.ts` | Unique IDs, bekannte Rule-Types, Counts 32/18 (`48-56`). | Semantik: nicht-cross Achievements ohne `rule.mode`; Operator-Code-Kollisionen; Duration-Form-Pfad. | Smoke, nicht Spec-Beweis |
| `src/lib/achievements/__tests__/migration.test.ts` | Code-Migration isoliert/idempotent. | Drizzle-SQL 0002 laeuft vor Hook; Doppel-Unlock-Conflict im echten Migration-Order-Pfad. | Zu isoliert |
| `src/db/__tests__/seedDb.test.ts` | Fresh install, self-heal, version bump, schema parity. | Version bump mit Journey-FK auf alte System-Location fehlt (`207-253`). Migrationliste hardcoded (`106-111`). | Wertvoll, aber kritischer Edge fehlt |
| `src/db/__tests__/journey.repository.test.ts` | CRUD und Refs funktionieren. | Setzt `durationMinutes` manuell (`86-100`), statt FlightForm/TrainForm-Pfad zu testen. | Maskiert Launch-Bug |
| `src/lib/export/__tests__/snapshot.test.ts` | Snapshot enthaelt Rows; manueller Replay klappt (`93-166`). | Ruft nicht `restoreFromBackup`; keine Transaction-/Failure-Simulation. | Name staerker als Test |
| `src/lib/forms/__tests__/journeySchemas.test.ts` | Grundvalidierung. | Keine Zeitlogik, kein `end < start`, keine negative Distanz fuer Other; Schema berechnet keine Duration. | Duenn |
| `src/lib/geo/__tests__/geo.test.ts` | Reale Koordinaten fuer FRA/JFK, NRT/LAX, Polar, Antipode. | Heuristik-Grenzen: Endpoint genau auf Equator/0/-50, Atlantik-Landbruecken, Sampling-Aufloesung. | Gut fuer Kern |
| `src/lib/stats/__tests__/stats.test.ts` | Aggregationen ueber Sample-Daten. | Year-in-Review/Export-Flow nicht als User-Workflow. | Solide Unit-Tests |
| `src/lib/journeys/__tests__/sections.test.ts` | Filter/Gruppierung. | UI-Screen-Integration, Accessibility, leere/kaputte Refs. | OK |

## Mock-/Isolation-Risiko

- Native AdMob/Analytics werden lazy importiert oder in Tests umgangen. Das ist fuer Node-Testbarkeit sinnvoll, kann aber reale Runtime-Probleme verstecken.
- Viele Tests arbeiten direkt auf Repository/Engine-Ebene. Die riskanten Pfade liegen aber in Forms, Hooks und Startup-Orchestrierung.
- Keine Snapshot-Tests im Sinne von "UI einfrieren" gefunden; `snapshot.test.ts` ist ein Backup-Snapshot-Test. Er hat echte Assertions, aber nicht auf Produktions-Restore.

## Wichtige Coverage-Luecken

| Gap | Warum relevant | Severity |
|---|---|---:|
| FlightForm/TrainForm -> createJourney -> Achievement-Recalc | Hier entsteht der Duration-Bug. | `[LAUNCH]` |
| Drizzle-Migration 0002 mit Doppel-Unlock | Kann App-Migration vor Code-Fix blockieren. | `[LAUNCH]` |
| Seed-DB version-upgrade mit Journey-FKs | Fast-Path bricht bei echten Bestandsusern. | `[LAUNCH]` |
| `restoreFromBackup` Failure mid-restore | Aktuell destructive und nicht transaktional (`backup/index.ts:97-123`). | `[LAUNCH]` |
| Release export / Metro `.sql` bundling | STATUS_OPT beschreibt Blocker, Tests decken Export nicht ab. | `[LAUNCH]` |
| Accessibility/theme smoke | Light theme, VoiceOver, iPad werden nicht automatisch geprueft. | `[POLISH]` |
| Year-in-Review / Backup-Restore-Cycle / Onboarding-Flow | User-relevante End-to-End-Flows fehlen. | `[POLISH]` |

## Fazit

Die Suite ist ein guter Anfang, aber kein Launch-Sicherheitsnetz. Fuer Phase 1 wuerde ich vor allem vier Tests nachziehen: Form-Duration, SQL-Conflict-Migration, Seed-FK-Upgrade, transactional Restore-Failure.

