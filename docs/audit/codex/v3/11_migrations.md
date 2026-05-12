# 11 — Migrations-Pfad

## Verdict

SQL-Migrations sind aktuell sauber und Expo-bundlingfähig. Achievement-ID-Migration startet die App auch bei Doppel-Unlock-Usern, meldet Konflikte aber wiederholt, weil Konflikte nicht als erledigt geloggt werden.

## SQL

- `0000_initial.sql`: Basistabellen, FKs, Indizes (`src/db/migrations/0000_initial.sql:1`).
- `0001_seed_columns.sql`: `is_system_seed`, `operators_code_idx`, `vehicles.code`, `vehicles_code_idx` (`src/db/migrations/0001_seed_columns.sql:1`).
- `0002_achievement_id_migration.sql`: bewusst noop, um Unique-Konflikt nicht beim SQL-Migrator auszulösen (`src/db/migrations/0002_achievement_id_migration.sql:1`).
- `0003_more_indexes.sql`: Cabin/Vehicle-Indizes mit IF NOT EXISTS (`src/db/migrations/0003_more_indexes.sql:1`).
- `migrations.js` importiert JS-String-Payloads statt `.sql`, daher war der temporäre Expo-Export grün (`src/db/migrations/migrations.js:7`).

## Code-Migration

- `applyAchievementIdMigrations()` ist idempotent, transaktional und verifiziert Post-Condition (`src/lib/achievements/migration.ts:95`).
- Konfliktfall "legacy und canonical existieren" wird erkannt und geskippt (`src/lib/achievements/migration.ts:127`).
- Reporting sendet Sentry Warning ohne PII (`src/lib/achievements/reportMigration.ts:33`).
- Hook ist non-blocking; App readiness wird nicht durch Achievement-Migration-Fehler blockiert (`src/hooks/useAchievementMigrations.ts:17`, `src/hooks/useDbReady.ts:23`).

## Befund

Bei Doppel-Unlock-User startet die App wirklich weiter: Code skippt den Rename. Aber `result.skipped` nutzt im Konfliktfall `reason: 'no-rows-match'` trotz vorhandener Rows (`src/lib/achievements/migration.ts:134`), und es wird kein Log geschrieben. Dadurch wird derselbe Konflikt bei jedem Cold Start erneut gemeldet. Kein Crash, aber Sentry-Rauschen.

