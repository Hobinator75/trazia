const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('sql');
// Bundle the pre-built seed database (assets/seed/trazia-seed.db) as a
// binary asset so the runtime can copy it into the SQLite directory on
// first launch. Without this, Metro treats `.db` as a JS module.
config.resolver.assetExts.push('db');

module.exports = withNativeWind(config, { input: './global.css' });
