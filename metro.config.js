const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Bundle the pre-built seed database (assets/seed/trazia-seed.db) as a
// binary asset so the runtime can copy it into the SQLite directory on
// first launch. Without this, Metro treats `.db` as a JS module.
config.resolver.assetExts.push('db');

// Note: we no longer push `sql` into sourceExts. Migrations come from
// src/db/migrations/sql-strings.ts (regenerated via
// `npm run build:migrations` after editing any *.sql file). Metro can
// bundle JS string literals natively, but lacks a `.sql` transformer
// across Expo SDKs.

module.exports = withNativeWind(config, { input: './global.css' });
