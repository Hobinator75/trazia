# 05 — Datenmodell

## Verdict

Das Schema ist für Phase 1 solide. Indizes und FKs sind überwiegend sinnvoll. Der wichtigste Datenmodell-Nebeneffekt betrifft Seed-Upgrades: `journeys.fromLocationId/toLocationId` schützen Locations per `restrict`, was gut für Userdaten ist, aber den Seed-DB-Rebuild für Bestandsuser blockieren kann.

## Stärken

- Locations haben Indizes für IATA, ICAO, IBNR, UN/LOCODE und Type (`src/db/schema.ts:44`).
- Journeys haben Indizes für Date, Mode, From, To, Operator plus Migration-Indizes für Cabin/Vehicle (`src/db/schema.ts:126`, `src/db/migrations/0003_more_indexes.sql:1`).
- Child-Collections hängen mit `onDelete: cascade` an Journey (`src/db/schema.ts:135`, `:147`, `:159`).
- Operator/Vehicle sind `set null`, damit Katalogwechsel nicht Reisen löschen (`src/db/schema.ts:103`, `:106`).
- Achievement unlocks haben Unique-Index auf `achievement_id`, passend zum "einmal unlocken" Modell (`src/db/schema.ts:206`).

## Risiken

- Seed-DB-Rebuild löscht System-Locations, aber Journeys referenzieren Locations per `restrict` (`src/db/schema.ts:92`). Das schützt Userdaten, lässt den Fast-Path für Bestandsuser mit System-Location-Journeys aber scheitern.
- `operators.modes` ist JSON-Text; Such-/Filtertests decken es ab, aber es gibt keinen DB-Level-Index auf JSON-Inhalte.
- `startTimezone`/`endTimezone` existieren, werden von Forms aber noch nicht geschrieben; Duration bleibt lokale Uhrzeit-Heuristik.

## Migration-Reihenfolge

- Frischer User: `0000` -> `0001` -> `0002` noop -> `0003`; Smoke-Test grün.
- Bestandsuser v0: `0001` ergänzt Seed-Spalten/Vehicle-Code/Indizes; plausibel.
- Achievement-ID-Rename liegt bewusst code-side, nicht SQL-blind (`src/db/migrations/0002_achievement_id_migration.sql:1`, `src/lib/achievements/migration.ts:95`).

