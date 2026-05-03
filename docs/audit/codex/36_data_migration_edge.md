# Codex Cross-Audit v2 - Datenmigrations-Hoelle

Fokus: alte Mini-Sample-DB, echte Seed-Daten, Custom-Locations, Backup/Restore.

## Szenario A: User hat alte System-FRA/MUC ohne Journeys

Fast-Path loescht alte `is_system_seed = 1` Rows und insertet neue Seed-DB-Rows (`loadFromSeedDb.ts:73-105`). Ergebnis: alte IDs verschwinden, neue IDs aus `trazia-seed.db` erscheinen. Ohne referenzierende Journeys ist das ok.

## Szenario B: User hat alte System-FRA/MUC mit Journeys

`journeys.from_location_id`/`to_location_id` referenzieren Locations mit `onDelete: restrict` (`schema.ts:92-97`). Der Fast-Path versucht trotzdem:

- `DELETE FROM main.locations WHERE is_system_seed = 1` (`loadFromSeedDb.ts:73`)
- danach erst Reinsert aus seed DB

Das wird bei echten Journey-FKs fehlschlagen. Die Transaction rollbackt und `useDbSeed` faellt auf `seedFromStatic` zurueck (`useDbSeed.ts:42-54`). Datenverlust ist dadurch wahrscheinlich verhindert, aber:

- Fast-Path funktioniert fuer aktive Bestandsuser nicht.
- Alte ungenaue System-FRA/MUC bleiben, weil JSON-Seed vorhandene Codes typischerweise als existent betrachtet.
- Tim sollte nicht glauben, dass die pre-built DB bestehende System-Seeds "sauber ersetzt".

## Szenario C: User hat Custom-Airport

Wenn `isSystemSeed = false`, wird er vom Fast-Path nicht geloescht (`loadFromSeedDb.ts:39`, `73-75`). Er bleibt auch im JSON-Fallback erhalten. Das ist korrekt.

Wenn alte Daten aber irrtuemlich `isSystemSeed = true` fuer manuell erstellte Orte gesetzt haben, koennte der Fast-Path sie loeschen. Unklar, ob alte App-Versionen Custom-Orte je so markiert haben; Tim sollte selbst draufschauen.

## Szenario D: Alte Custom-Airports kollidieren mit neuem Seed-Code

Falls ein User frueher "FRA" manuell angelegt hat und `isSystemSeed = false`, wird der neue echte FRA zusaetzlich eingefuegt. Das schuetzt Journey-FKs, erzeugt aber moegliche Such-Duplikate. Das ist wahrscheinlich besser als Datenverlust, braucht aber UI-Verhalten.

## Szenario E: Backup/Restore

`restoreFromBackup` ist destructive und nicht transaktional:

- Loescht alle relevanten Tabellen (`backup/index.ts:97-109`)
- Insertet Snapshot danach wieder (`111-123`)
- Kein `BEGIN`/`ROLLBACK`

Wenn ein Insert in der Mitte fehlschlaegt, sind vorhandene User-Daten bereits weg. Der Test `snapshot.test.ts:93-166` replayt manuell den Happy Path, testet aber nicht die Production-Funktion und keinen Failure.

## Empfehlung

1. Seed-Fast-Path nicht loeschen/replacen, solange FKs existieren. Besser: `INSERT OR IGNORE`/upsert nach stabilem natuerlichem Key, oder alte system rows nur aktualisieren, wenn keine Journey-FKs betroffen sind.
2. Stabile IDs aus natuerlichen Codes ableiten, damit Rebuilds nicht alle System-IDs wechseln.
3. `restoreFromBackup` in eine DB-Transaction legen und vor Destruction alle FK-/Unique-Risiken validieren.
4. Ein Migrationstest braucht: alte FRA row + Journey darauf + seed.version alt -> App startet, Journey-FK bleibt gueltig, echte Seed-Daten sind danach konsistent.

