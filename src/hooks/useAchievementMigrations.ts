import { useEffect, useState } from 'react';

import { db } from '@/db/client';
import {
  applyAchievementIdMigrations,
  type ApplyAchievementIdMigrationsResult,
} from '@/lib/achievements/migration';
import { captureException } from '@/lib/observability/sentry';

export interface UseAchievementMigrationsState {
  done: boolean;
  result: ApplyAchievementIdMigrationsResult | undefined;
  error: Error | undefined;
}

// Achievement-ID migrations are best-effort: a failure must NOT block the
// app launch. We surface the error to Sentry so the data team can see it,
// but report `done: true` so downstream hooks (`useDbReady`) treat the
// step as cleared. The next cold-start retries — the migration is
// idempotent and gated by `achievement_id_migrations_log`.
export function useAchievementMigrations(enabled: boolean = true): UseAchievementMigrationsState {
  const [state, setState] = useState<UseAchievementMigrationsState>({
    done: false,
    result: undefined,
    error: undefined,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    applyAchievementIdMigrations(db)
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          void captureException(result.error, {
            origin: 'achievement-id-migration',
            applied: result.applied.map((m) => m.fromId),
            conflicts: result.conflicts.map((c) => ({
              fromId: c.migration.fromId,
              fromCount: c.fromCount,
              toCount: c.toCount,
            })),
          });
        }
        setState({ done: true, result, error: result.error });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const err = error instanceof Error ? error : new Error(String(error));
        void captureException(err, { origin: 'achievement-id-migration:hook' });
        setState({ done: true, result: undefined, error: err });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
