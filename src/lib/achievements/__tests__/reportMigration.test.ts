import { describe, expect, it, vi } from 'vitest';

import type { ApplyAchievementIdMigrationsResult } from '@/lib/achievements/migration';

import { reportMigrationOutcome } from '../reportMigration';

const sample = (overrides: Partial<ApplyAchievementIdMigrationsResult> = {}) => {
  return {
    applied: [],
    skipped: [],
    conflicts: [],
    ...overrides,
  } as ApplyAchievementIdMigrationsResult;
};

const migration = {
  fromId: 'atlantic_crosser',
  toId: 'transatlantic',
  reason: 'spec compliance',
};

describe('reportMigrationOutcome', () => {
  it('captures the error via reportException when result.error is set', async () => {
    const reportException = vi.fn(async () => {});
    const reportMessage = vi.fn(async () => {});
    const err = new Error('boom');

    await reportMigrationOutcome(sample({ error: err, applied: [migration], conflicts: [] }), {
      reportException,
      reportMessage,
    });

    expect(reportException).toHaveBeenCalledTimes(1);
    expect(reportException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        origin: 'achievement-id-migration',
        applied: ['atlantic_crosser'],
      }),
    );
    expect(reportMessage).not.toHaveBeenCalled();
  });

  it('captures conflicts as warning messages with migration tags', async () => {
    const reportException = vi.fn(async () => {});
    const reportMessage = vi.fn(async () => {});

    await reportMigrationOutcome(
      sample({
        conflicts: [{ migration, fromCount: 1, toCount: 1 }],
      }),
      { reportException, reportMessage },
    );

    expect(reportException).not.toHaveBeenCalled();
    expect(reportMessage).toHaveBeenCalledTimes(1);
    expect(reportMessage).toHaveBeenCalledWith(
      'Achievement-ID migration conflict: atlantic_crosser → transatlantic',
      'warning',
      expect.objectContaining({
        tags: expect.objectContaining({
          migration: 'achievement-id',
          from: 'atlantic_crosser',
          to: 'transatlantic',
        }),
        extra: expect.objectContaining({
          fromCount: 1,
          toCount: 1,
          conflictCount: 2,
        }),
      }),
    );
  });

  it('emits both an exception and a conflict message when both occur', async () => {
    const reportException = vi.fn(async () => {});
    const reportMessage = vi.fn(async () => {});

    await reportMigrationOutcome(
      sample({
        error: new Error('partial failure'),
        conflicts: [{ migration, fromCount: 2, toCount: 1 }],
      }),
      { reportException, reportMessage },
    );

    expect(reportException).toHaveBeenCalledTimes(1);
    expect(reportMessage).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the migration is fully clean', async () => {
    const reportException = vi.fn(async () => {});
    const reportMessage = vi.fn(async () => {});

    await reportMigrationOutcome(sample({ applied: [migration], conflicts: [] }), {
      reportException,
      reportMessage,
    });

    expect(reportException).not.toHaveBeenCalled();
    expect(reportMessage).not.toHaveBeenCalled();
  });
});
