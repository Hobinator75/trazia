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

## Pre-existing bundle blocker — RESOLVED (Launch-Fix Block 6, 2026-05-04)

`npx expo export --platform ios` lief vorher gegen die Wand, weil
`src/db/migrations/migrations.js` `.sql`-Files direkt importierte und
Metro keinen `.sql`-Transformer hatte. Die Lösung lebt jetzt in:

- `scripts/generate-migration-strings.ts` (`npm run build:migrations`)
  liest jede `*.sql`-Datei und schreibt
  `src/db/migrations/sql-strings.ts` mit JS-Stringkonstanten.
- `migrations.js` importiert die generierten Strings statt der
  Rohdateien.
- `metro.config.js` braucht die `sourceExts.push('sql')`-Zeile nicht
  mehr und ist entsprechend bereinigt.

Build-Smoke verifiziert: `npx expo export --platform ios` schließt
sauber mit einem 10.7 MB Hermes-Bundle (Total .expo-bundle-test
≈ 15 MB inkl. Assets).

Bundle-Size-Messung (Block 1 follow-up): die Seed-DB ist tatsächlich
~0.8 % größer als die JSON-Fallbacks (perf-evidence.txt) — die
13× Cold-Start-Beschleunigung wiegt das auf.
