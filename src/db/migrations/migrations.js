// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo
// SQL payloads come from the auto-generated sql-strings.ts (run
// `npm run build:migrations` after editing any migration .sql file).
// Metro bundles JS string literals natively; importing .sql directly
// would need a custom transformer that's flaky across Expo SDKs.

import journal from './meta/_journal.json';
import {
  M_0000_INITIAL,
  M_0001_SEED_COLUMNS,
  M_0002_ACHIEVEMENT_ID_MIGRATION,
  M_0003_MORE_INDEXES,
} from './sql-strings';

export default {
  journal,
  migrations: {
    m0000: M_0000_INITIAL,
    m0001: M_0001_SEED_COLUMNS,
    m0002: M_0002_ACHIEVEMENT_ID_MIGRATION,
    m0003: M_0003_MORE_INDEXES,
  },
};
