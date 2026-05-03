# Codex Cross-Audit v2 - Seed-DB-Robustness

Fokus: mental simulierte reale Device-Pfade fuer `src/db/seed/loadFromSeedDbAsset.ts`, `src/db/seed/loadFromSeedDb.ts` und `src/hooks/useDbSeed.ts`.

| Pfad | Hat Code diesen Pfad? | Was schiefgehen kann | Wahrscheinlichkeit | Severity |
|---|---|---|---:|---:|
| Erststart auf leerem iPhone | Ja. `Asset.fromModule(...).downloadAsync()` -> `ATTACH` -> Delete/Insert -> `seed.version` setzen (`loadFromSeedDbAsset.ts:23-30`, `loadFromSeedDb.ts:45-124`). | Wenn `asset.localUri` nach Download nicht file-lokal ist, bekommt SQLite eine ungeeignete URI. JSON-Fallback sollte retten. | Niedrig | `[LAUNCH]` |
| iOS-Simulator | Ja, wahrscheinlich stabiler, weil Metro/Expo meist lokale Datei liefert. | Simulator validiert nicht alle echten Asset-Cache-/Sandbox-Pfade. Kein Beweis fuer Device-Robustheit. | Mittel | `[LAUNCH]` |
| Update von v1 JSON-Seed auf v1.1 Seed-DB ohne User-Journeys | Ja. System rows werden geloescht/reinserted, User rows bleiben (`loadFromSeedDb.ts:73-105`). | IDs der System rows wechseln, was ok ist, solange keine User-Daten darauf referenzieren. | Mittel | `[LAUNCH]` |
| Update von v1 mit User-Journeys auf System-Locations | Nicht sauber. `DELETE FROM main.locations WHERE is_system_seed = 1` kollidiert mit `journeys.from/to_location_id` `onDelete: restrict` (`schema.ts:92-97`). | Fast-Path bricht ab. `useDbSeed` faellt auf JSON zurueck (`useDbSeed.ts:42-54`), also kein sofortiger App-Crash; aber die behauptete Optimierung greift bei echten Bestandsusern nicht. | Hoch fuer aktive v1-User | `[LAUNCH]` |
| `FileSystem.copyAsync`/Asset-Download mid-copy abgebrochen | Indirekt ueber `expo-asset`; keine explizite Checksum/File-Existence-Pruefung. | `ATTACH` wirft bei halb/korrupter DB. Fallback rettet, solange JSON-Seed bundlebar bleibt. | Niedrig | `[LAUNCH]` |
| Korrupte `trazia-seed.db` im Bundle | Ja, Fehlerpfad ueber thrown `ATTACH`/SELECT. | App startet nur, wenn `seedFromStatic` weiterhin funktioniert. Wenn JSON-Fallback spaeter entfernt wird, wird dieser Pfad Launch-blockierend. | Niedrig | `[LAUNCH]` |
| `AsyncStorage["seed.version"]` auf aktuelle Version manipuliert, DB aber stale/partial | Teilweise. Code prueft nur: version aktuell + irgendeine System-Location vorhanden (`loadFromSeedDb.ts:45-55`). | Unterseedete oder alte Kataloge bleiben liegen; keine Counts/Checksum/Sentinel-Version pro Tabelle. iOS-Backup-Restore zwischen Geraeten kann so alte Seed-Daten konservieren. | Mittel | `[LAUNCH]` |
| Zwei gleichzeitige Seed-Runs | Kein Mutex. `useDbSeed` startet pro Mount einen async Run (`useDbSeed.ts:29-58`). | Zweiter Run kann an `ATTACH ... AS trazia_seed`, `BEGIN TRANSACTION` oder Locks scheitern; Fallback kann parallel ebenfalls schreiben. | Niedrig im aktuellen Single-root, hoeher bei Background-Tasks | `[LAUNCH]` |
| `DETACH` misslingt | Code schluckt DETACH-Fehler (`loadFromSeedDb.ts:115-120`). | Alias kann auf derselben Connection haengen bleiben; naechster Run mit demselben Alias kann fehlschlagen. | Niedrig | `[LAUNCH]` |
| Seed-DB rebuild reproduzierbar | Nein. Seed-DB IDs sind random UUIDs (`scripts/build-seed-db.ts:86-88`, `145-214`). | Asset-Diffs sind noisy; system-seed IDs wechseln bei jedem Build. Das verschaerft Upgrade-/FK-Probleme. | Hoch pro Build | `[POLISH]` |

## Kurzfazit

Der Fast-Path ist fuer Fresh Installs plausibel, aber nicht robust genug als alleinige Quelle. Fuer Phase 1 ist der JSON-Fallback der Airbag. Vor Launch sollte Tim mindestens einen Device-Smoke auf echtem iPhone machen und den Existing-user-FK-Fall als Test aufnehmen. Wenn der Fallback irgendwann entfernt wird, wird der aktuelle Fast-Path ein echter Datenmigrations-Blocker.

