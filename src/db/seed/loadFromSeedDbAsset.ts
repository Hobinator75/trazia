import { Asset } from 'expo-asset';

import { loadFromSeedDb, type LoadFromSeedDbResult, type SeedStorage } from './loadFromSeedDb';
import type { DrizzleDb } from '../types';

// expo-asset returns a Module-Resource handle; require() makes Metro bundle
// the .db binary alongside the JS bundle (see metro.config.js — assetExts
// must include 'db'). Asset.fromModule() resolves it to a local cached URI
// after downloadAsync().
const SEED_DB_MODULE = require('../../../assets/seed/trazia-seed.db');

export interface LoadFromSeedDbAssetOptions {
  db: DrizzleDb;
  storage: SeedStorage;
}

// Production cold-start path. Resolves the bundled trazia-seed.db asset to a
// local file URI, strips the `file://` prefix (SQLite ATTACH expects a path)
// and delegates the heavy lifting to `loadFromSeedDb`.
export async function loadFromSeedDbAsset(
  opts: LoadFromSeedDbAssetOptions,
): Promise<LoadFromSeedDbResult> {
  const asset = Asset.fromModule(SEED_DB_MODULE);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;
  const seedDbPath = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;

  return loadFromSeedDb({ db: opts.db, seedDbPath, storage: opts.storage });
}
