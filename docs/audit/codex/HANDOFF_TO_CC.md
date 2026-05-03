# Handoff to Claude Code - Codex Cross-Audit v2

Bitte nicht die alten Audits wiederholen. Diese Punkte sind die Fix-Prompts aus dem Codex-Gegencheck.

## 1. `[LAUNCH]` Achievement-ID-Migration wirklich conflict-safe machen

Problem:

- `src/db/migrations/0002_achievement_id_migration.sql:11-12` updated blind von `atlantic_crosser` auf `transatlantic`.
- Bei vorhandenen beiden Unlocks verletzt das `achievement_unlocks_achievement_id_unique`.
- Die Code-Migration in `src/lib/achievements/migration.ts` wuerde den Konflikt skippen, laeuft aber erst nach `migrations.success` (`src/hooks/useDbReady.ts:13-17`).

Fix-Erwartung:

- SQL 0002 conflict-safe machen oder SQL-Rename entfernen und nur Code-Migration nutzen.
- Test: In-memory DB mit beiden Unlocks -> Drizzle SQL migration path -> kein Crash, App kann weiter.
- `useAchievementMigrations` soll `result.conflicts.length > 0` an Sentry melden, auch ohne `result.error`.

## 2. `[LAUNCH]` Duration-Achievements im echten Form-Pfad reparieren

Problem:

- `long_haul`, `ultra_long_haul`, `marathon_12h`, Train-Duration-Achievements lesen `durationMinutes`.
- Flight/Train/Other Forms schreiben nur Start/End-Zeit, kein `durationMinutes`.

Fix-Erwartung:

- Duration aus `startTimeLocal`/`endTimeLocal` berechnen; `end < start` als Overnight behandeln oder bewusst validieren.
- FlightForm-Integrationstest: FRA-JFK mit 7h -> `long_haul` unlockt.
- TrainForm-Integrationstest post-launch: 7h Train -> `train_long_haul` unlockt.

## 3. `[LAUNCH]` Achievement-Mode-Isolation erzwingen

Problem:

- 29 non-cross Achievements haben kein `rule.mode`.
- Engine scannt fuer Geo/Vehicle/Operator/Cabin alle Journeys.
- `DB` Code-Kollision: Brit Air (flight) und Deutsche Bahn (train).

Fix-Erwartung:

- Entweder alle non-cross rules bekommen `mode`, und Engine filtert bei jedem Rule-Type.
- Oder Engine nutzt `achievement.appliesTo`, bevor sie eine Rule evaluiert.
- Tests: Train first class darf nicht Flight `first_class` unlocken; Brit-Air-Flug darf nicht `ice_rider`/`db_loyalty_25` unlocken.

## 4. `[LAUNCH]` Backup-Restore transaction-safe machen

Problem:

- `src/lib/backup/index.ts:97-123` loescht alle Tabellen und insertet danach ohne Transaction.
- Mid-restore-Fehler kann User-Daten zerstoeren.

Fix-Erwartung:

- Restore in explizite Transaction.
- Vorher Snapshot-Shape/FK/Unique grob validieren.
- Test: Insert-Fehler waehrend Restore -> alte DB bleibt unveraendert.

## 5. `[LAUNCH]` Phase-1 Train-Gating

Problem:

- Train ist aktuell in Onboarding und Add-Journey sichtbar.

Fix-Erwartung:

- Release-Flag oder Konstante: Phase 1 zeigt nur Flight + eventuell Other, aber nicht Train.
- Test/Smoke: ModePicker und Onboarding zeigen Zug nicht im Phase-1-Config.

## 6. `[LAUNCH]` Release-Fixes nicht vergessen

- `.sql` Metro transformer oder generierte JS-Strings fuer Migrationen.
- Echte AdMob IDs statt Sample IDs.
- Privacy-Policy/App-Privacy fuer Sentry/PostHog/Ads aktualisieren oder SDKs deaktivieren.

## 7. `[POST-LAUNCH]` Seed-DB-Fast-Path fuer Existing User

Problem:

- `DELETE FROM main.locations WHERE is_system_seed = 1` kollidiert mit Journey-FKs.

Fix-Erwartung:

- Nicht blind Delete/Reinsert. Upsert/insert-ignore mit stabilen IDs oder FK-aware Update-Strategie.
- Test: alte System-FRA mit Journey-FK + seed.version alt -> Seed laeuft ohne Fast-Path-Crash und Journey bleibt gueltig.

