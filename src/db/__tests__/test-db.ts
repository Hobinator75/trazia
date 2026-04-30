import path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from '../schema';

export type TestDb = ReturnType<typeof createTestDb>['db'];

const MIGRATIONS_FOLDER = path.resolve(__dirname, '..', 'migrations');

export function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

  return {
    db,
    sqlite,
    close: () => sqlite.close(),
  };
}
