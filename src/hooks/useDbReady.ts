import { useDbMigrations } from '@/db/client';
import { useDbSeed } from './useDbSeed';

export interface DbReadyState {
  ready: boolean;
  migrationsDone: boolean;
  seedDone: boolean;
  error: Error | undefined;
}

export function useDbReady(): DbReadyState {
  const migrations = useDbMigrations();
  const seed = useDbSeed(migrations.success);

  return {
    ready: migrations.success && seed.success,
    migrationsDone: migrations.success,
    seedDone: seed.success,
    error: migrations.error ?? seed.error,
  };
}
