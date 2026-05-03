# Codex Cross-Audit v2 - Schema-Drift-Risiko

## Was stimmt

`src/db/schema.sql` ist keine Vollkopie der App-DB, sondern absichtlich nur eine Plain-SQL-Definition der drei System-Seed-Tabellen: `locations`, `operators`, `vehicles` (`schema.sql:1-16`). `scripts/build-seed-db.ts` nutzt diese Datei, um `assets/seed/trazia-seed.db` zu materialisieren (`build-seed-db.ts:115-116`).

Der User-Horrorfall "neue Spalte in journeys -> seed.db hat alte journeys -> ATTACH crash" ist so nicht exakt: seed.db enthaelt keine `journeys`, und der Loader inseriert nur die drei Systemtabellen (`loadFromSeedDb.ts:77-103`). Eine Journey-Migration allein bricht den Seed-DB-Loader nicht direkt.

## Was nicht stimmt

| Drift-Punkt | Befund | Risiko |
|---|---|---|
| Test ist nicht selbst-discovering | `seedDb.test.ts` hardcoded `0000` bis `0003` (`106-111`). Eine neue Migration kann vergessen werden, ohne dass der Drift-Test sie sieht. | Hoch ueber Zeit |
| "Single source of truth" ist manuell | `schema.sql:8-11` fordert, Drizzle-Schema und SQL-Datei beide zu editieren. Das ist kein Single Source, sondern ein manueller Sync-Vertrag. | Mittel |
| System-Spalte hinzugefuegt | Wenn `locations`/`operators`/`vehicles` neue NOT NULL-Spalte ohne Default bekommt und `schema.sql`/Seed-DB alt bleibt, `INSERT INTO main... SELECT ...` kann crashen. | Hoch fuer Seed-Upgrades |
| Index-/Default-Drift | Current schema.sql hat die relevanten System-Indizes. Aber Default-/Column-order muss manuell synchron bleiben (`schema.sql:13-16`). | Mittel |
| Random IDs | Seed-DB buildet jedes Mal neue UUIDs (`build-seed-db.ts:86-88`). Selbst ohne Schema-Drift sind Diffs und Upgrade-Verhalten instabil. | Mittel |

## Was passiert bei Drift?

1. Fast-Path: `ATTACH` klappt, aber `INSERT ... SELECT` scheitert wegen fehlender/anderer Spalte.
2. Transaction rollbackt; `seed.version` bleibt unveraendert (`loadFromSeedDb.ts:105-124`).
3. `useDbSeed` faellt auf `seedFromStatic` zurueck (`useDbSeed.ts:42-54`).
4. App bleibt wahrscheinlich launchbar, solange JSON-Seed und runtime schema ebenfalls kompatibel sind.

Das ist besser als ein harter Crash, aber die Fast-Path-Optimierung wird still degradiert. Wenn spaeter jemand den JSON-Fallback entfernt, wird Drift sofort kritisch.

## Empfehlung

1. Drift-Test dynamisch machen: Migrationen aus `src/db/migrations/meta/_journal.json` oder dem Verzeichnis lesen, nicht hardcoden.
2. CI-Check: temp DB A via alle Drizzle-Migrationen, temp DB B via `schema.sql`; `PRAGMA table_info`, `PRAGMA index_list`, `PRAGMA index_info` fuer die drei Systemtabellen vergleichen.
3. `npm run build:seed-db -- --check` einfuehren: Seed-DB in temp output bauen, nicht ins Asset schreiben, und Schema/Counts gegen erwartete Werte pruefen.
4. Stabile System-IDs aus Codes ableiten (`airport:FRA`, `operator:flight:LH`, `vehicle:flight:B77W` gehasht/namespace UUID), statt random UUIDs.
5. Jede Migration an `locations`/`operators`/`vehicles` muss einen CI-Fail ausloesen, bis `schema.sql` und `assets/seed/trazia-seed.db` aktualisiert sind.

