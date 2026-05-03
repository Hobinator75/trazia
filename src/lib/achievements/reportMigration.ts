import type { ApplyAchievementIdMigrationsResult } from '@/lib/achievements/migration';
import { captureException, captureMessage } from '@/lib/observability/sentry';

export interface MigrationReporters {
  reportException: typeof captureException;
  reportMessage: typeof captureMessage;
}

const defaultReporters: MigrationReporters = {
  reportException: captureException,
  reportMessage: captureMessage,
};

// Pure side-effect handler: report errors as Sentry exceptions and
// conflicts as Sentry warnings (no PII). Lives in its own module so
// unit tests can exercise the reporting logic without dragging in the
// React hook's `expo-sqlite`-rooted dependency tree.
export async function reportMigrationOutcome(
  result: ApplyAchievementIdMigrationsResult,
  reporters: MigrationReporters = defaultReporters,
): Promise<void> {
  if (result.error) {
    await reporters.reportException(result.error, {
      origin: 'achievement-id-migration',
      applied: result.applied.map((m) => m.fromId),
      conflicts: result.conflicts.map((c) => ({
        fromId: c.migration.fromId,
        fromCount: c.fromCount,
        toCount: c.toCount,
      })),
    });
  }
  for (const conflict of result.conflicts) {
    await reporters.reportMessage(
      `Achievement-ID migration conflict: ${conflict.migration.fromId} → ${conflict.migration.toId}`,
      'warning',
      {
        tags: {
          migration: 'achievement-id',
          from: conflict.migration.fromId,
          to: conflict.migration.toId,
        },
        extra: {
          fromCount: conflict.fromCount,
          toCount: conflict.toCount,
          conflictCount: conflict.fromCount + conflict.toCount,
        },
      },
    );
  }
}
