# Optimization Session Status

Stand: 2026-05-03

## Block 1 — Pre-built SQLite seed-DB

Status: **abgeschlossen**

### Was geliefert ist
- `src/db/schema.sql` — single source of truth für die drei System-Tabellen
- `scripts/build-seed-db.ts` + `npm run build:seed-db` — generiert
  `assets/seed/trazia-seed.db` (1.01 MB, 3.399 locations + 1.044 operators
  + 222 vehicles, ~22 ms Build)
- `src/db/seed/loadFromSeedDb.ts` — Runtime-Loader mit ATTACH+rebuild,
  transaktional, mode-agnostisch (läuft in expo-sqlite und better-sqlite3)
- `src/db/seed/loadFromSeedDbAsset.ts` — RN-only Wrapper, lädt das
  Asset über expo-asset
- `src/hooks/useDbSeed.ts` — versucht zuerst die schnelle Seed-DB,
  fällt bei Fehler auf `seedFromStatic` (JSON-Pfad) zurück
- `src/db/seed/constants.ts` — gemeinsame `SEED_VERSION` (= '3') für
  beide Pfade
- `src/db/__tests__/seedDb.test.ts` — 8 neue Tests (146/146 grün)
- `scripts/measure-cold-start.ts` — Perf-Vergleich, Output in
  `docs/audit/perf-evidence.txt`
- `metro.config.js` — `assetExts.push('db')` damit Metro die
  Seed-Datei als Binär-Asset bundlet

### Messung
| Pfad         | Zeit (better-sqlite3) | Zeilen |
|--------------|-----------------------|--------|
| JSON-Import  | 47.5 ms               | 4.665  |
| Seed-DB      | 3.6 ms                | 4.665  |
| Speed-up     | 13.1×                 | —      |

Auf iOS/Android (expo-sqlite hat höheren Per-Statement-Overhead) ist
der reale Faktor erfahrungsgemäß noch 2-3× größer.

## Block 2 — Achievement-ID-Migration mit Rollback

Status: **abgeschlossen**

### Was geliefert ist
- `src/lib/achievements/migration.ts` — `applyAchievementIdMigrations(db)`:
  idempotent, transaktional, mit Verifikation und Rollback.
  - Eigene Tabelle `achievement_id_migrations_log` trackt bereits
    angewandte Renames pro Device.
  - Edge-Case "User hat sowohl alte UND neue ID" → wird als `conflicts`
    geloggt, Migration skipt (würde sonst die unique-index-Constraint
    verletzen).
- `src/hooks/useAchievementMigrations.ts` — best-effort Hook, läuft nach
  Drizzle-Migrations und vor Seed; Fehler gehen an Sentry, App startet
  trotzdem.
- `src/hooks/useDbReady.ts` — kettet Migrations → Achievement-Migrations
  → Seed.
- `src/lib/achievements/__tests__/migration.test.ts` — 6 neue Tests:
  fresh-DB, legacy-DB, idempotency, conflict-edge, rollback-on-error,
  unique-index preservation.
- `src/db/migrations/0002_achievement_id_migration.sql` — Belt-and-braces
  Notiz dass die Code-Migration parallel läuft.
- `RELEASE_CHECKLIST.md` — neuer Abschnitt "DB-Migrationen".

### Test-Counts
- Vor dieser Session: 138
- Nach Block 1: 146 (+8)
- Nach Block 2: 152 (+6)

## Pre-existing bundle blocker (NICHT durch Block 1 verursacht)

`npx expo export --platform ios` schlägt fehl beim Parsen von
`src/db/migrations/0000_initial.sql`. Ursache: `migrations.js`
importiert die `.sql`-Files direkt (`import m0000 from './0000_initial.sql'`)
und `metro.config.js` registriert `.sql` als source-ext, aber kein
Transformer wandelt SQL → JS-String um.

Üblicher Fix: `babel-plugin-inline-import` installieren und in
`babel.config.js` für `.sql` aktivieren — das macht aus jedem SQL-Import
einen String. Dieser Fix ist außerhalb des Scopes dieser Optimization
Session und sollte vor dem ersten EAS-Build adressiert werden.

Konsequenz für Block 1: die Bundle-Size-Messung (1.10) konnte nicht
ausgeführt werden. Statisch: +1.01 MB durch `assets/seed/trazia-seed.db`,
neutralisiert sich teilweise wenn die JSON-Fallbacks später entfernt
werden (Backup-First — vorerst behalten).
