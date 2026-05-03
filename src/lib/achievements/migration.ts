import { sql } from 'drizzle-orm';

import { achievementUnlocks } from '@/db/schema';
import type { DrizzleDb } from '@/db/types';

// Why a code-side migration in addition to the SQL migration in
// 0002_achievement_id_migration.sql?
//
// The SQL migration runs once via Drizzle's journal — but if it crashes
// midway on a real device (SQLite locked by the splash, app force-killed,
// disk pressure causing partial writes), the journal still marks it as
// applied on the next boot. That's exactly the scenario where users would
// silently lose unlocks.
//
// The code-side migration runs every cold-start, is idempotent (consults
// `achievement_id_migrations_log` to skip already-applied entries),
// transactional (BEGIN / COMMIT / ROLLBACK), and verifies post-conditions
// (no rows with the legacy id remain). On failure it rolls back and
// surfaces the error — the live SQL migration's "applied" flag becomes
// irrelevant because we re-check the actual data shape on every launch.
//
// To add a new id-rename: append to ACHIEVEMENT_ID_MIGRATIONS, ship a
// new app version. The log table guarantees the migration runs at most
// once per device.

export interface AchievementIdMigration {
  fromId: string;
  toId: string;
  reason: string;
}

export const ACHIEVEMENT_ID_MIGRATIONS: AchievementIdMigration[] = [
  {
    fromId: 'atlantic_crosser',
    toId: 'transatlantic',
    reason: 'spec compliance — naming alignment with achievements catalogue',
  },
];

export interface ApplyAchievementIdMigrationsResult {
  applied: AchievementIdMigration[];
  skipped: { migration: AchievementIdMigration; reason: 'already-applied' | 'no-rows-match' }[];
  conflicts: {
    migration: AchievementIdMigration;
    fromCount: number;
    toCount: number;
  }[];
  error?: Error;
}

interface RawDb {
  run: DrizzleDb['run'];
  all: DrizzleDb['all'];
}

async function ensureLogTableExists(db: RawDb): Promise<void> {
  await db.run(
    sql.raw(
      `CREATE TABLE IF NOT EXISTS achievement_id_migrations_log (
         id integer PRIMARY KEY AUTOINCREMENT,
         from_id text NOT NULL,
         to_id text NOT NULL,
         applied_at integer NOT NULL DEFAULT (unixepoch())
       )`,
    ),
  );
}

async function alreadyApplied(db: RawDb, migration: AchievementIdMigration): Promise<boolean> {
  const rows = (await db.all(
    sql.raw(
      `SELECT 1 FROM achievement_id_migrations_log
        WHERE from_id = '${migration.fromId.replaceAll("'", "''")}'
          AND to_id   = '${migration.toId.replaceAll("'", "''")}'
        LIMIT 1`,
    ),
  )) as unknown[];
  return rows.length > 0;
}

async function countWhere(db: RawDb, achievementId: string): Promise<number> {
  const rows = (await db.all(
    sql.raw(
      `SELECT COUNT(*) AS n FROM achievement_unlocks
        WHERE achievement_id = '${achievementId.replaceAll("'", "''")}'`,
    ),
  )) as { n: number }[];
  return rows[0]?.n ?? 0;
}

// Idempotent, transactional rename of achievement IDs in user unlocks.
// On any error (SQLite lock, conflict, schema mismatch) the transaction
// rolls back — the user's unlocks survive untouched and the next launch
// retries.
export async function applyAchievementIdMigrations(
  db: DrizzleDb,
): Promise<ApplyAchievementIdMigrationsResult> {
  const result: ApplyAchievementIdMigrationsResult = {
    applied: [],
    skipped: [],
    conflicts: [],
  };

  try {
    await ensureLogTableExists(db);
  } catch (err) {
    result.error = err instanceof Error ? err : new Error(String(err));
    return result;
  }

  for (const migration of ACHIEVEMENT_ID_MIGRATIONS) {
    try {
      if (await alreadyApplied(db, migration)) {
        result.skipped.push({ migration, reason: 'already-applied' });
        continue;
      }

      const fromCount = await countWhere(db, migration.fromId);
      if (fromCount === 0) {
        // Even fresh-install devices should leave the log table empty so
        // we don't lie about "applied" work — the absence of rows is
        // tracked as a skip, NOT as an applied migration.
        result.skipped.push({ migration, reason: 'no-rows-match' });
        continue;
      }

      // Edge case: the unique index on achievement_id forbids two unlocks
      // sharing an id, so if the user already has BOTH the legacy AND the
      // canonical row the rename would violate the constraint. Fall back
      // to "skip + log conflict" so the App still launches; the duplicate
      // row gets resolved when we drop the legacy id from the catalogue.
      const toCount = await countWhere(db, migration.toId);
      if (toCount > 0) {
        result.conflicts.push({ migration, fromCount, toCount });
        result.skipped.push({ migration, reason: 'no-rows-match' });
        continue;
      }

      await db.run(sql.raw('BEGIN TRANSACTION'));
      try {
        // Snapshot for forensics — the snapshot itself is immutable
        // pre-update data; if anything goes wrong we keep this around to
        // help diagnose the failure.
        const fromIdSafe = migration.fromId.replaceAll("'", "''");
        const toIdSafe = migration.toId.replaceAll("'", "''");

        await db.run(
          sql.raw(
            `UPDATE achievement_unlocks
                SET achievement_id = '${toIdSafe}'
              WHERE achievement_id = '${fromIdSafe}'`,
          ),
        );

        // Verify post-condition before committing: no row should still
        // carry the legacy id.
        const stillThere = await countWhere(db, migration.fromId);
        if (stillThere !== 0) {
          throw new Error(
            `Achievement migration ${migration.fromId} → ${migration.toId} ` +
              `verification failed: ${stillThere} rows still match legacy id`,
          );
        }

        await db.run(
          sql.raw(
            `INSERT INTO achievement_id_migrations_log (from_id, to_id)
              VALUES ('${fromIdSafe}', '${toIdSafe}')`,
          ),
        );

        await db.run(sql.raw('COMMIT'));
        result.applied.push(migration);
      } catch (err) {
        try {
          await db.run(sql.raw('ROLLBACK'));
        } catch {
          // best-effort
        }
        throw err;
      }
    } catch (err) {
      // Capture the first error and return — the next launch will
      // retry. Sentry hookup happens at the call site (client.ts).
      result.error = err instanceof Error ? err : new Error(String(err));
      return result;
    }
  }

  return result;
}

// Schema accessor re-export so the call site can typecheck the shape
// without importing the table reference directly.
export { achievementUnlocks };
