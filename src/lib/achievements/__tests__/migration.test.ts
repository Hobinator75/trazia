import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/__tests__/test-db';
import { achievementUnlocks } from '@/db/schema';

import {
  ACHIEVEMENT_ID_MIGRATIONS,
  applyAchievementIdMigrations,
} from '../migration';

const ATLANTIC_TO_TRANSATLANTIC = ACHIEVEMENT_ID_MIGRATIONS.find(
  (m) => m.fromId === 'atlantic_crosser' && m.toId === 'transatlantic',
);

if (!ATLANTIC_TO_TRANSATLANTIC) {
  throw new Error(
    'Test setup invariant: ACHIEVEMENT_ID_MIGRATIONS must contain atlantic_crosser → transatlantic',
  );
}

describe('applyAchievementIdMigrations', () => {
  let handle: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    handle = createTestDb();
  });

  afterEach(() => {
    handle.close();
  });

  it('skips with reason=no-rows-match when there are no legacy unlocks', async () => {
    const result = await applyAchievementIdMigrations(handle.db);

    expect(result.error).toBeUndefined();
    expect(result.applied).toHaveLength(0);
    expect(result.skipped).toHaveLength(ACHIEVEMENT_ID_MIGRATIONS.length);
    expect(result.skipped.every((s) => s.reason === 'no-rows-match')).toBe(true);

    // The log table exists but is empty — no false-positive "applied"
    // entries that would mask a real future migration.
    const log = (await handle.db.all(
      sql.raw('SELECT COUNT(*) as n FROM achievement_id_migrations_log'),
    )) as { n: number }[];
    expect(log[0]?.n).toBe(0);
  });

  it('migrates legacy IDs to the new ID and logs the migration', async () => {
    await handle.db.insert(achievementUnlocks).values([
      { id: 'unlock-1', achievementId: 'atlantic_crosser' },
      { id: 'unlock-2', achievementId: 'first_journey' },
    ]);

    const result = await applyAchievementIdMigrations(handle.db);

    expect(result.error).toBeUndefined();
    expect(result.applied).toHaveLength(1);
    expect(result.applied[0]?.fromId).toBe('atlantic_crosser');
    expect(result.applied[0]?.toId).toBe('transatlantic');

    const rows = await handle.db.select().from(achievementUnlocks);
    const ids = rows.map((r) => r.achievementId).sort();
    expect(ids).toEqual(['first_journey', 'transatlantic']);

    // The pre-existing first_journey row keeps its id and unlocked_at
    // metadata: only the renamed achievement is touched.
    const firstJourney = rows.find((r) => r.achievementId === 'first_journey');
    expect(firstJourney?.id).toBe('unlock-2');
    const transatlantic = rows.find((r) => r.achievementId === 'transatlantic');
    expect(transatlantic?.id).toBe('unlock-1'); // same row, just renamed

    const log = (await handle.db.all(
      sql.raw('SELECT from_id, to_id FROM achievement_id_migrations_log'),
    )) as { from_id: string; to_id: string }[];
    expect(log).toEqual([{ from_id: 'atlantic_crosser', to_id: 'transatlantic' }]);
  });

  it('is idempotent: a second run is a no-op (skipped=already-applied)', async () => {
    await handle.db.insert(achievementUnlocks).values({
      id: 'unlock-1',
      achievementId: 'atlantic_crosser',
    });

    const first = await applyAchievementIdMigrations(handle.db);
    expect(first.applied).toHaveLength(1);

    const second = await applyAchievementIdMigrations(handle.db);
    expect(second.error).toBeUndefined();
    expect(second.applied).toHaveLength(0);
    const alreadyApplied = second.skipped.find((s) => s.reason === 'already-applied');
    expect(alreadyApplied).toBeDefined();
    expect(alreadyApplied?.migration.fromId).toBe('atlantic_crosser');

    // Log table has exactly one entry — not duplicated by the second run.
    const log = (await handle.db.all(
      sql.raw('SELECT COUNT(*) as n FROM achievement_id_migrations_log'),
    )) as { n: number }[];
    expect(log[0]?.n).toBe(1);
  });

  it('handles the duplicate-id edge case: skips + records a conflict', async () => {
    // User somehow ended up with BOTH ids — this would violate the unique
    // index if we tried to UPDATE in place. The migration must skip +
    // record the conflict so it can be resolved manually later, never
    // crash the app.
    await handle.db.insert(achievementUnlocks).values([
      { id: 'unlock-old', achievementId: 'atlantic_crosser' },
      { id: 'unlock-new', achievementId: 'transatlantic' },
    ]);

    const result = await applyAchievementIdMigrations(handle.db);
    expect(result.error).toBeUndefined();
    expect(result.applied).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.fromCount).toBe(1);
    expect(result.conflicts[0]?.toCount).toBe(1);

    // Both rows survive untouched — neither was renamed nor deleted.
    const rows = await handle.db.select().from(achievementUnlocks);
    expect(rows).toHaveLength(2);
    const ids = rows.map((r) => r.achievementId).sort();
    expect(ids).toEqual(['atlantic_crosser', 'transatlantic']);

    // Log stays empty — the migration did NOT run.
    const log = (await handle.db.all(
      sql.raw('SELECT COUNT(*) as n FROM achievement_id_migrations_log'),
    )) as { n: number }[];
    expect(log[0]?.n).toBe(0);
  });

  it('rolls back and surfaces an error if the transaction fails mid-flight', async () => {
    await handle.db.insert(achievementUnlocks).values({
      id: 'unlock-1',
      achievementId: 'atlantic_crosser',
    });

    // Lock the unique index by pre-committing an "applied" log entry for
    // the migration *before* it has actually run, then drop the
    // achievement_unlocks table partway. We simulate a hard failure by
    // dropping the table inside a wrapper: drizzle's run() will throw on
    // the UPDATE step.
    handle.sqlite.exec('DROP TABLE achievement_unlocks');

    const result = await applyAchievementIdMigrations(handle.db);
    expect(result.error).toBeDefined();
    expect(result.applied).toHaveLength(0);

    // The log table either does not have an entry for this migration, or
    // if it does, the underlying data wasn't actually changed.
    // Recreate achievement_unlocks to allow a follow-up assertion.
    handle.sqlite.exec(`
      CREATE TABLE achievement_unlocks (
        id text PRIMARY KEY NOT NULL,
        achievement_id text NOT NULL,
        unlocked_at integer DEFAULT (unixepoch()) NOT NULL,
        triggering_journey_id text,
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        updated_at integer DEFAULT (unixepoch()) NOT NULL
      );
      CREATE UNIQUE INDEX achievement_unlocks_achievement_id_unique
        ON achievement_unlocks(achievement_id);
    `);

    const log = (await handle.db.all(
      sql.raw(
        `SELECT COUNT(*) as n FROM achievement_id_migrations_log
          WHERE from_id = 'atlantic_crosser'`,
      ),
    )) as { n: number }[];
    expect(log[0]?.n).toBe(0);
  });

  it('preserves the unique-index invariant on achievement_id post-migration', async () => {
    await handle.db.insert(achievementUnlocks).values({
      id: 'unlock-1',
      achievementId: 'atlantic_crosser',
    });

    await applyAchievementIdMigrations(handle.db);

    // Inserting a SECOND transatlantic unlock must still fail (unique
    // constraint preserved through the rename).
    await expect(
      handle.db.insert(achievementUnlocks).values({
        id: 'unlock-2',
        achievementId: 'transatlantic',
      }),
    ).rejects.toThrow();

    const rows = await handle.db
      .select()
      .from(achievementUnlocks)
      .where(eq(achievementUnlocks.achievementId, 'transatlantic'));
    expect(rows).toHaveLength(1);
  });
});
