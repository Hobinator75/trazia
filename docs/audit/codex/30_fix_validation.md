# Codex Cross-Audit v2 - Phase I: Fix-Validierung

Scope: Stichproben-Validierung der 9 relevanten Fix-Commits nach dem ersten Claude-Code-Audit. Keine Tests ausgeführt, keine Code-Änderungen. Severity ist nach Tims Launch-Strategie markiert: `[LAUNCH]` = Flug/Phase 1, `[POST-LAUNCH]` = Zug/Phase 8.1, `[POLISH]` = nicht blockierend.

## c4c696c - `feat(audit): vollständige Seed-Daten`

| Check | Befund | Severity | Urteil |
|---|---|---:|---|
| 3308 Airports / 993 Airlines / 147 Aircraft | JSON-Kataloge enthalten exakt diese Größen. Zusätzlich: 124 Bahnhöfe, 51 Rail-Operatoren, 75 Züge. | `[LAUNCH]` | OK |
| Stichprobe FRA/JFK/NRT/ZRH/SIN/AKL | Koordinaten plausibel: FRA 50.026706/8.55835, JFK 40.639447/-73.779317, NRT 35.76858/140.388714, ZRH 47.458056/8.548056, SIN 1.35019/103.994003, AKL -37.01199/174.786331. | `[LAUNCH]` | OK |
| Doppelte/fehlende Codes | Keine doppelten Airport-IATAs, keine doppelten Airline-IATAs, keine doppelten Aircraft-Codes. 33 Airports haben kein IATA und werden im Seed-DB-Build übersprungen (`scripts/build-seed-db.ts:142-144`). | `[LAUNCH]` | Nicht blocker, aber Dokumentationslücke |
| Airline-Code-Kollision | `DB` existiert als Brit Air in Airlines und als Deutsche Bahn in Rail-Operatoren. Da Achievements Operator-Codes nicht nach Mode filtern (`src/lib/achievements/engine.ts:231-240`), kann ein Brit-Air-Flug Zug-Achievements triggern. | `[LAUNCH]` + `[POST-LAUNCH]` | BUG |
| Build-Skript still fehlerhaft? | `scripts/build-static-data.ts` sortiert stabil (`210-217`) und validiert Pflicht-Airports (`222-225`), nutzt aber Live-URLs ohne Pin/Checksum (`17-19`, `99-157`). Reproduzierbar fuer gleichen Input, nicht fuer Zeitverlauf. | `[POLISH]` | Teilweise |
| Seed-DB-Reproduzierbarkeit | `scripts/build-seed-db.ts` generiert UUIDs per `globalThis.crypto.randomUUID()` (`86-88`, genutzt `145-214`). Zwei Builds erzeugen nicht byte-identische DBs. | `[POLISH]` | Nicht reproduzierbar |

## 69a5458 - `feat(audit): Journey-Edit-Screen mit FlightForm-Wiederverwendung`

| Check | Befund | Severity | Urteil |
|---|---|---:|---|
| Edit-Mode existiert | Flight/Train/Other-Formulare haben echte Edit-Pfade mit `updateJourney` und Child-Collection-Replacement (`FlightForm.tsx:204-210`, `TrainForm.tsx:199-205`, `OtherForm.tsx:187-192`). | `[LAUNCH]` | OK |
| Child-Replacement-Atomizitaet | Update der Journey und Loeschen/Neuinsert der Tags/Photos/Companions laufen nicht in einer expliziten Transaction. Crash zwischen Parent-Update und Child-Replay kann Metadaten verlieren. | `[LAUNCH]` | Risiko |
| Dauer-Felder | Edit/Create uebernehmen `startTimeLocal`/`endTimeLocal`, setzen aber nie `durationMinutes` (`FlightForm.tsx:185-202`; `TrainForm.tsx:180-197`; `OtherForm.tsx:173-185`). | `[LAUNCH]` | BUG |
| Testabdeckung | Repository-Tests setzen `durationMinutes` manuell (`src/db/__tests__/journey.repository.test.ts:86-100`) und testen nicht den realen Form-Pfad. | `[LAUNCH]` | Test-Gap |

## db6bd7b - `feat(audit): Achievement-Catalog auf Spec-Niveau`

| Check | Befund | Severity | Urteil |
|---|---|---:|---|
| 32 Flight-Achievements | `docs/achievements.json` enthaelt 32 `appliesTo: "flight"` und 18 `train`; Catalog-Test prueft nur Counts (`catalog.test.ts:48-56`). | `[LAUNCH]` | Formal OK |
| Cross-modal versehentlich Flight? | 29 nicht-cross Achievements haben kein `rule.mode`. Beispiele: `transatlantic`, `first_class`, `star_alliance`, `ice_rider`, `first_class_rail`. Engine filtert viele Rule-Types nicht nach Mode (`engine.ts:144-155`, `188-217`, `231-251`, `298-300`). | `[LAUNCH]` + `[POST-LAUNCH]` | BUG |
| Rule-Types implementiert? | Ja, alle Rule-Types aus dem Catalog sind in `catalog.test.ts:6-22` und `engine.ts` bekannt. Das Problem ist Semantik/Mode-Isolation, nicht fehlende Switch-Cases. | `[LAUNCH]` | Teilweise OK |
| Stichprobe `long_haul` | Rule ist implementiert (`single_journey_duration`, `engine.ts:134-141`), aber reale Forms schreiben keine `durationMinutes`. Unlock bleibt im normalen User-Pfad aus. | `[LAUNCH]` | BUG |
| Stichprobe `transatlantic` | `geo_condition` wird ausgewertet, aber nicht nach `mode: flight` gefiltert (`engine.ts:144-155`). Ein Schiff/Train mit passenden Koordinaten kann Flight-Achievement ausloesen. | `[LAUNCH]` | BUG |
| Migration 0002 vs. Code-Migration | SQL-Migration updated blind (`0002_achievement_id_migration.sql:11-12`) und kann bei vorhandenen `atlantic_crosser` + `transatlantic` an Unique-Index scheitern (`schema.ts:193-207`), bevor der idempotente Code laeuft (`useDbReady.ts:13-17`). | `[LAUNCH]` | BUG |

## bc3dfe3 - `feat(audit/train): Train-Seed-Daten`

| Check | Befund | Severity | Urteil |
|---|---|---:|---|
| Bahnhof-Seed-Groesse | 124 Stationen statt der urspruenglich genannten 5k-15k. `RELEASE_CHECKLIST.md:24-27` dokumentiert das als Post-Launch-TODO. | `[POST-LAUNCH]` | Dokumentierter Trade-off |
| Rail-Operatoren | 51 Operatoren vorhanden. Code-Kollision `DB` mit Brit Air ist real und wird vom Achievement-Code nicht entschärft. | `[POST-LAUNCH]` | BUG-Folge |
| Train-Vehicles | 75 Zugfahrzeuge vorhanden. Kategorien reichen fuer `highspeed`, `intercity`, `regional`, `sleeper`-nahe Checks. | `[POST-LAUNCH]` | OK fuer Pilotumfang |

## 6f98d2c - `feat(audit/train): Phase 8.1 vollständig aktiviert`

| Check | Befund | Severity | Urteil |
|---|---|---:|---|
| Train aktuell sichtbar | Train ist im ModePicker und Onboarding aktiv (`ModePicker.tsx:16-23`, `app/onboarding/modes.tsx:18-24`) und Add-Screen rendert `TrainForm` (`app/(tabs)/journeys/add.tsx:21-27`). Tim plant Hide vor Launch; das muss im Release-Branch passieren. | `[LAUNCH]` | Release-Gate |
| TrainForm Paritaet zu FlightForm | Felder sind nah dran, aber Over-night/Duration fehlt wie bei Flight (`TrainForm.tsx:180-197`). `endTime < startTime` wird nicht in `durationMinutes` auf naechsten Tag gerechnet. | `[POST-LAUNCH]` | BUG |
| `first_train` Mental-Walkthrough | `first_train` ist `count` mit `mode: train`; `evalCount` filtert korrekt (`engine.ts:109-114`). Sollte bei erster Train-Journey unlocken. | `[POST-LAUNCH]` | OK |
| `transalpine` | Kein Achievement mit ID/Name `transalpine` gefunden. Unklar, ob Spec das erwartet; Tim sollte selbst draufschauen. | `[POST-LAUNCH]` | Unklar |
| `night_train` | Es gibt kein `night_train`; naechste Entsprechungen sind `train_long_haul`/`train_marathon` (`docs/achievements.json:487-502`) und `sleeper_train`. Duration-Varianten triggern im Form-Pfad nicht. | `[POST-LAUNCH]` | BUG |
| Irrtuemliche Flight-Trigger | Train-Cabin `first` kann Flight-`first_class` triggern, weil `evalCabinClass` alle Journeys scannt (`engine.ts:298-300`). | `[POST-LAUNCH]` + `[LAUNCH]` | BUG |

## 35b6a0b - `polish(audit): top-10 polish-items abgearbeitet`

| Check | Befund | Severity | Urteil |
|---|---|---:|---|
| Sichtbarer Polish | Mehrere urspruengliche Polish-/Spec-Punkte sind erledigt; keine Gegenindikation aus Stichprobe. | `[POLISH]` | OK |
| Theme-Polish | Theme-Store existiert, aber App ist weiterhin fast komplett dark-hardcoded. `useThemeBinding` setzt nur NativeWind scheme (`useThemeBinding.ts:8-13`); `DateField` erzwingt `themeVariant="dark"` (`DateField.tsx:67-72`, `113-119`). | `[POLISH]` | Nicht voll geloest |
| Legal/Privacy-Polish | Datenschutzerklaerung nennt AdMob/RevenueCat, aber nicht Sentry/PostHog (`docs/privacy-policy-de.md:15-27`). Settings UI beschreibt sie (`app/(tabs)/profile/index.tsx` via rg), Code nutzt sie. | `[LAUNCH]` | Release-Risiko |

## 9dc1157 - `test(audit): test-coverage erhöht + final pre-launch checks`

| Check | Befund | Severity | Urteil |
|---|---|---:|---|
| Test-Dateien | 17 Testdateien gefunden. Das ist substanziell besser als vorher. | `[LAUNCH]` | OK |
| Wertigkeit | Gute Kern-Tests fuer DB-Repos, Geo, Stats, Achievement-Engine. Aber mehrere Tests pruefen Counts/Smoke statt reale User-Pfade. | `[LAUNCH]` | Gemischt |
| Maskierter Duration-Bug | Journey-Repository-Test setzt `durationMinutes` direkt (`journey.repository.test.ts:86-100`), waehrend reale Forms es nicht setzen. | `[LAUNCH]` | Test-Gap |
| Maskierter Seed-FK-Bug | Seed-DB-Version-Bump-Test hat stale System-FRA, aber keine Journey-FK auf diese Row (`seedDb.test.ts:207-253`). Dadurch sieht der destructive replacement path gruen aus. | `[LAUNCH]` | Test-Gap |
| Backup-Test | `snapshot.test.ts:93-166` repliziert Delete/Insert manuell, ruft aber nicht `restoreFromBackup` und testet keinen Mid-Restore-Fehler. | `[LAUNCH]` | Test-Gap |

## 4a3ddcf - `perf(seed): pre-built SQLite-DB`

| Check | Befund | Severity | Urteil |
|---|---|---:|---|
| Neuer Fast-Path existiert | `.db` Asset wird via `expo-asset` aufgeloest (`loadFromSeedDbAsset.ts:23-30`), dann per `ATTACH`/`INSERT SELECT` kopiert (`loadFromSeedDb.ts:68-105`). | `[LAUNCH]` | OK |
| iOS Device vs Simulator | Code nutzt `asset.localUri ?? asset.uri`; wenn `downloadAsync()` keine lokale file-URI liefert, bekommt SQLite evtl. eine nicht-lokale URI (`loadFromSeedDbAsset.ts:23-28`). Fallback faengt das ab, aber Fast-Path ist nicht hart verifiziert. | `[LAUNCH]` | Risiko, fallback vorhanden |
| Existing-user FK-Fall | Fast-Path loescht alle System-Locations (`loadFromSeedDb.ts:73`) bei `onDelete: restrict` Journeys (`schema.ts:92-97`). Bestehende Reisen auf System-FRA/JFK blockieren den DELETE. Fallback ueber JSON rettet App, aber die Optimierung greift fuer echte Upgrade-User nicht. | `[LAUNCH]` | BUG/Risiko |
| Race Conditions | Kein Modul-Mutex in `useDbSeed`; zwei gleichzeitige Runs koennen `ATTACH AS trazia_seed`/`BEGIN TRANSACTION` kollidieren (`useDbSeed.ts:33-58`, `loadFromSeedDb.ts:68-72`). Wahrscheinlichkeit niedrig, aber Code ist nicht concurrency-safe. | `[LAUNCH]` | Risiko |
| Schema 1:1 | `schema.sql` ist nur fuer drei System-Seed-Tabellen (`schema.sql:1-16`). Drift-Test hardcoded Migrationen (`seedDb.test.ts:106-111`), also nicht zukunftssicher. | `[LAUNCH]` | Risiko |
| Korruptes seed.db | `ATTACH` wirft, `useDbSeed` faellt auf JSON-Seed zurueck (`useDbSeed.ts:42-54`). App bricht nicht sofort, solange JSON-Bundling intakt bleibt. | `[LAUNCH]` | OK mit Fallback |

## f7e01ff - `fix(migration): Achievement-Migration Idempotenz`

| Check | Befund | Severity | Urteil |
|---|---|---:|---|
| Code-Migration idempotent? | In Isolation ja: Log-Tabelle, Skip bei already-applied/no rows, Transaction um Update (`migration.ts:111-160`). | `[LAUNCH]` | OK in Isolation |
| SQL-Migration davor | Drizzle-`0002` kann denselben Rename zuerst ausfuehren und bei Konflikt crashen (`0002_achievement_id_migration.sql:11-12`). Dann startet die Code-Migration nie (`useDbReady.ts:13-17`). CCs Kommentar in SQL (`6-10`) ist faktisch falsch fuer den Doppel-Unlock-Fall. | `[LAUNCH]` | BUG |
| Doppel-Unlock Edge | Code-Migration wuerde bei `fromCount > 0 && toCount > 0` beide Rows behalten und nur `conflicts` + `skipped` setzen (`migration.ts:127-136`). Keine Row wird geloescht. Das ist bewusst launch-schonend, aber laesst Legacy-Muell liegen. | `[LAUNCH]` | Teilweise OK |
| Sentry-Logging | Hook loggt nur, wenn `result.error` gesetzt ist (`useAchievementMigrations.ts:35-45`). Reine `conflicts` werden nicht an Sentry gesendet, obwohl Checklist Conflict-Reports erwartet (`RELEASE_CHECKLIST.md:53-54`). | `[LAUNCH]` | BUG |
| DB-Lock | Wenn SQLite beim `BEGIN`/Update locked, Code catcht, versucht Rollback, setzt `result.error` und Hook blockiert Launch nicht (`migration.ts:139-184`, `useAchievementMigrations.ts:35-52`). Retry erst naechster Cold-Start. | `[LAUNCH]` | Akzeptabel |

