import { useDbMigrations } from '@/db/client';
import { useAchievementMigrations } from './useAchievementMigrations';
import { useDbSeed } from './useDbSeed';

export interface DbReadyState {
  ready: boolean;
  migrationsDone: boolean;
  seedDone: boolean;
  error: Error | undefined;
}

export function useDbReady(): DbReadyState {
  const migrations = useDbMigrations();
  // Achievement-ID migrations run after schema migrations, before seeding.
  // A failure here is non-blocking — see useAchievementMigrations.
  const achievementMigrations = useAchievementMigrations(migrations.success);
  const seed = useDbSeed(migrations.success && achievementMigrations.done);

  return {
    ready: migrations.success && achievementMigrations.done && seed.success,
    migrationsDone: migrations.success,
    seedDone: seed.success,
    error: migrations.error ?? seed.error,
  };
}
