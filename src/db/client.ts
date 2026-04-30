import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

import * as schema from './schema';

const DB_NAME = 'trazia.db';

const expoDb = SQLite.openDatabaseSync(DB_NAME, {
  enableChangeListener: true,
});

export const db = drizzle(expoDb, { schema });
export type DB = typeof db;
export { schema };
