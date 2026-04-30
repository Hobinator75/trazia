import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import * as SQLite from 'expo-sqlite';

import migrations from './migrations/migrations';
import * as schema from './schema';

export const DB_NAME = 'trazia.db';

const expoDb = SQLite.openDatabaseSync(DB_NAME, {
  enableChangeListener: true,
});
expoDb.execSync('PRAGMA foreign_keys = ON;');
expoDb.execSync('PRAGMA journal_mode = WAL;');

export const db = drizzle(expoDb, { schema });
export type DB = typeof db;
export { schema };

export function useDbMigrations() {
  return useMigrations(db, migrations);
}

// Closes and deletes the on-device SQLite file. Caller is responsible for
// reloading the app afterwards: the cached `db` reference is unusable after
// reset until the JS bundle re-evaluates this module.
export async function resetDatabase(): Promise<void> {
  expoDb.closeSync();
  await SQLite.deleteDatabaseAsync(DB_NAME);
}
