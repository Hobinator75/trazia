import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

// Mode-agnostic Drizzle SQLite handle. Repositories accept this so the same
// implementation runs against expo-sqlite (async) at runtime and against
// better-sqlite3 (sync) in Node tests.
export type DrizzleDb = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;
