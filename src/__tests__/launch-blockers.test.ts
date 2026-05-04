// Reproduction tests for the four launch-blocker bugs surfaced by the
// Codex Cross-Audit v2 (docs/audit/codex/HANDOFF_TO_CC.md). Each test
// must fail BEFORE its corresponding fix-block lands and pass AFTER.

import fs from 'node:fs';
import path from 'node:path';

import { sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/__tests__/test-db';
import { evaluateAll, __setAchievementsCatalogForTesting } from '@/lib/achievements/engine';
import type { Achievement, AchievementContext } from '@/lib/achievements/types';
import { restoreFromSnapshot } from '@/lib/backup/restore';
import { computeDurationMinutes } from '@/lib/journeys/duration';
import { SNAPSHOT_VERSION, type DbSnapshot } from '@/lib/export/snapshot';

const SQL_0002_PATH = path.resolve(
  __dirname,
  '..',
  'db',
  'migrations',
  '0002_achievement_id_migration.sql',
);

describe('launch-blocker reproductions', () => {
  let handle: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    handle = createTestDb();
  });

  afterEach(() => {
    handle.close();
    __setAchievementsCatalogForTesting(null);
  });

  // 0.2a) SQL-0002 must not crash when a device has BOTH the legacy and
  // the canonical achievement_id rows. The unique-index would normally
  // reject the blind UPDATE — the fix turns the SQL into a no-op and
  // delegates the rename to the idempotent code-migration.
  it('SQL-0002 is conflict-safe when both legacy and canonical rows exist', () => {
    handle.sqlite
      .prepare('INSERT INTO achievement_unlocks (id, achievement_id) VALUES (?, ?)')
      .run('unlock-old', 'atlantic_crosser');
    handle.sqlite
      .prepare('INSERT INTO achievement_unlocks (id, achievement_id) VALUES (?, ?)')
      .run('unlock-new', 'transatlantic');

    const sqlText = fs.readFileSync(SQL_0002_PATH, 'utf-8');
    // Drizzle uses `--> statement-breakpoint` markers to split statements;
    // mimic that to execute each one independently the way the runtime would.
    const statements = sqlText
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    expect(() => {
      for (const stmt of statements) {
        handle.sqlite.exec(stmt);
      }
    }).not.toThrow();
  });

  // The SQL-0002 file is now a no-op: re-running it any number of times
  // must leave the achievement_unlocks table untouched.
  it('SQL-0002 is idempotent — running it twice is a no-op', () => {
    handle.sqlite
      .prepare('INSERT INTO achievement_unlocks (id, achievement_id) VALUES (?, ?)')
      .run('unlock-keep', 'transatlantic');

    const sqlText = fs.readFileSync(SQL_0002_PATH, 'utf-8');
    const statements = sqlText
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) handle.sqlite.exec(stmt);
    for (const stmt of statements) handle.sqlite.exec(stmt);

    const row = handle.sqlite
      .prepare("SELECT id, achievement_id FROM achievement_unlocks WHERE id = 'unlock-keep'")
      .get() as { id: string; achievement_id: string } | undefined;

    expect(row).toEqual({ id: 'unlock-keep', achievement_id: 'transatlantic' });
  });

  // 0.2b) FlightForm/TrainForm/OtherForm must compute durationMinutes
  // from start/end. The repository tests previously set the value
  // manually (journey.repository.test.ts:86-100), masking the gap.
  it('computeDurationMinutes returns 180 for 14:00 → 17:00', async () => {
    expect(computeDurationMinutes('14:00', '17:00', '2026-05-01')).toBe(180);
  });

  // 0.2c) A Train journey with cabinClass=first must NOT unlock the
  // Flight `first_class` achievement (appliesTo=flight). The engine
  // currently ignores appliesTo for cabin/operator/vehicle/geo rules.
  it('Train cabin=first does not unlock Flight first_class achievement', async () => {
    const trainOnly: Achievement[] = [
      {
        id: 'first_class',
        title: 'First Class',
        description: 'Travel in first class.',
        appliesTo: 'flight',
        rule: { type: 'cabin_class', cabinClass: 'first' },
      },
    ];

    const ctx: AchievementContext = {
      allJourneys: [
        {
          id: 'j-train-1',
          mode: 'train',
          fromLocationId: 'loc-fra',
          toLocationId: 'loc-ber',
          date: '2026-04-01',
          startTimeLocal: null,
          endTimeLocal: null,
          startTimezone: null,
          endTimezone: null,
          operatorId: null,
          vehicleId: null,
          serviceNumber: null,
          cabinClass: 'first',
          seatNumber: null,
          parentJourneyId: null,
          distanceKm: 500,
          durationMinutes: 240,
          routeType: null,
          routePointsJson: null,
          notes: null,
          rating: null,
          weather: null,
          isManualEntry: true,
          source: 'manual',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      allUnlocks: [],
    };

    const unlocks = evaluateAll(ctx, trainOnly);
    const ids = unlocks.map((u) => u.achievementId);
    expect(ids).not.toContain('first_class');
  });

  // 0.2d) A failing restore must leave the user's existing data intact.
  // Currently the restore deletes everything before re-inserting outside
  // a transaction, so a mid-restore failure permanently destroys data.
  it('restoreFromSnapshot rolls back on failure and preserves existing data', async () => {
    // Seed: one real journey the user wouldn't want to lose.
    handle.sqlite
      .prepare(
        'INSERT INTO locations (id, name, lat, lng, type, is_system_seed) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('loc-keep', 'Keep Location', 50, 8, 'airport', 0);
    handle.sqlite
      .prepare(
        'INSERT INTO journeys (id, mode, from_location_id, to_location_id, date) VALUES (?, ?, ?, ?, ?)',
      )
      .run('j-keep', 'flight', 'loc-keep', 'loc-keep', '2026-04-01');

    // Snapshot has a journey whose FK refers to a location that is NOT in
    // the snapshot — restore will fail mid-way at the journeys insert.
    const brokenSnapshot: DbSnapshot = {
      version: SNAPSHOT_VERSION,
      exportedAt: '2026-05-01T00:00:00Z',
      locations: [],
      operators: [],
      vehicles: [],
      journeys: [
        {
          id: 'j-broken',
          mode: 'flight',
          fromLocationId: 'does-not-exist',
          toLocationId: 'does-not-exist',
          date: '2026-04-01',
          startTimeLocal: null,
          endTimeLocal: null,
          startTimezone: null,
          endTimezone: null,
          operatorId: null,
          vehicleId: null,
          serviceNumber: null,
          cabinClass: null,
          seatNumber: null,
          parentJourneyId: null,
          distanceKm: null,
          durationMinutes: null,
          routeType: null,
          routePointsJson: null,
          notes: null,
          rating: null,
          weather: null,
          isManualEntry: true,
          source: 'manual',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      journeyCompanions: [],
      journeyTags: [],
      journeyPhotos: [],
      trips: [],
      tripJourneys: [],
      achievementUnlocks: [],
    };

    const result = await restoreFromSnapshot(handle.db, brokenSnapshot);
    expect(result.ok).toBe(false);

    // The pre-existing journey must still be there.
    const rows = (await handle.db.all(
      sql.raw("SELECT COUNT(*) as n FROM journeys WHERE id = 'j-keep'"),
    )) as { n: number }[];
    expect(rows[0]?.n).toBe(1);

    const locRows = (await handle.db.all(
      sql.raw("SELECT COUNT(*) as n FROM locations WHERE id = 'loc-keep'"),
    )) as { n: number }[];
    expect(locRows[0]?.n).toBe(1);
  });
});
