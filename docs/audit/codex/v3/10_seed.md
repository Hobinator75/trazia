# 10 — Seed-Daten & Pre-built DB

## Verdict

Frischer User: gut. Bestandsuser mit Journeys auf System-Locations: Fast-Path scheitert plausibel an FK und fällt auf JSON zurück. Das ist ein Upgrade-Risiko, kein frischer Launch-Blocker.

## Assets

- `assets/static/airports.json`: ca. 820 KB.
- `assets/static/airlines.json`: ca. 164 KB.
- `assets/static/aircraft.json`: ca. 20 KB.
- `assets/seed/trazia-seed.db`: ca. 1.0 MB.
- Seed-DB enthält 3399 Locations, 1044 Operators, 222 Vehicles.

## Fast Path

`loadFromSeedDbAsset()` bündelt die DB via `require('../../../assets/seed/trazia-seed.db')` (`src/db/seed/loadFromSeedDbAsset.ts:10`). `loadFromSeedDb()` attached die Seed-DB, löscht System-Rows und insertet neu in einer Transaktion (`src/db/seed/loadFromSeedDb.ts:68`).

## Frischer User

Fresh install ist plausibel unter 2 Sekunden. Lokale Evidence ist 3.6 ms für Seed-DB vs. 47.5 ms JSON unter better-sqlite3 (`docs/audit/perf-evidence.txt:4`). Temporärer `expo export --platform ios` bündelt das Seed-DB-Asset erfolgreich.

## Existing-User-FK-Risiko

Bestandsuser mit Journey auf System-Location blockieren `DELETE FROM main.locations WHERE is_system_seed = 1` wegen FK `restrict` (`src/db/seed/loadFromSeedDb.ts:73`, `src/db/schema.ts:92`). Ich habe das mit SQLite reproduziert: Transaction wirft `FOREIGN KEY constraint failed`, Rollback lässt alte Daten stehen.

Workaround existiert: `useDbSeed()` fällt bei Fast-Path-Fehler auf `seedFromStatic()` zurück (`src/hooks/useDbSeed.ts:42`). Das rettet Launchbarkeit, aber Fast-Path ist für Upgrades mit echten Journeys nicht zuverlässig.

## Schema-Drift

- Seed-DB-Paritätstest existiert (`src/db/__tests__/seedDb.test.ts:101`).
- Er ist nicht zukunftssicher, weil Migrationsliste im Test hardcoded ist und primär Systemtabellen prüft.
- Up-to-date-Check prüft nur `seed.version` plus mindestens eine System-Location (`src/db/seed/loadFromSeedDb.ts:54`). Kein Count/Checksum/Sentinel gegen partial/stale Catalog.

