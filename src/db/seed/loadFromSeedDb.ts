import { eq, sql } from 'drizzle-orm';

import { locations, operators, vehicles } from '../schema';
import type { DrizzleDb } from '../types';
import { SEED_VERSION, SEED_VERSION_KEY } from './constants';

export interface SeedStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?: (key: string) => Promise<void>;
}

export interface LoadFromSeedDbOptions {
  db: DrizzleDb;
  seedDbPath: string;
  storage: SeedStorage;
}

export interface LoadFromSeedDbResult {
  loaded: boolean;
  reason: 'fresh-install' | 'self-heal' | 'version-upgrade' | 'up-to-date';
  counts: { locations: number; operators: number; vehicles: number };
}

const ZERO_COUNTS = { locations: 0, operators: 0, vehicles: 0 } as const;
const SEED_ALIAS = 'trazia_seed';

// Bulk-loads system-seed rows from a pre-built SQLite asset (assembled by
// scripts/build-seed-db.ts) into the live device DB.
//
// The hot path is a transactional "rebuild system tables" sequence:
//   BEGIN
//     DELETE FROM <table> WHERE is_system_seed = 1
//     ATTACH '<seedDbPath>' AS trazia_seed
//     INSERT INTO main.<table> SELECT * FROM trazia_seed.<table>
//     DETACH trazia_seed
//   COMMIT
//
// User-created rows (isSystemSeed = 0) are never touched. On any failure
// the transaction rolls back and seed.version stays unchanged so the next
// app launch retries.
export async function loadFromSeedDb(opts: LoadFromSeedDbOptions): Promise<LoadFromSeedDbResult> {
  const { db, seedDbPath, storage } = opts;

  const currentVersion = await storage.getItem(SEED_VERSION_KEY);

  const probe = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.isSystemSeed, true))
    .limit(1);
  const hasSystemData = probe.length > 0;

  if (currentVersion === SEED_VERSION && hasSystemData) {
    return { loaded: false, reason: 'up-to-date', counts: ZERO_COUNTS };
  }

  const reason: LoadFromSeedDbResult['reason'] =
    currentVersion === null ? 'fresh-install' : !hasSystemData ? 'self-heal' : 'version-upgrade';

  // SQLite escapes single quotes inside string literals by doubling them.
  // The seed-db path is internal (asset cache dir on iOS/Android, controlled
  // path in tests) so this is defence in depth, not user-input handling.
  const escapedPath = seedDbPath.replaceAll("'", "''");

  // Some drivers refuse ATTACH inside an explicit BEGIN, so attach first
  // and wrap only the destructive writes in a transaction.
  await db.run(sql.raw(`ATTACH DATABASE '${escapedPath}' AS ${SEED_ALIAS}`));

  try {
    await db.run(sql.raw('BEGIN TRANSACTION'));
    try {
      await db.run(sql.raw(`DELETE FROM main.locations WHERE is_system_seed = 1`));
      await db.run(sql.raw(`DELETE FROM main.operators WHERE is_system_seed = 1`));
      await db.run(sql.raw(`DELETE FROM main.vehicles  WHERE is_system_seed = 1`));

      await db.run(
        sql.raw(
          `INSERT INTO main.locations
             (id, name, city, country, lat, lng, type, iata, icao, ibnr, unlocode, is_system_seed, created_at, updated_at)
           SELECT
             id, name, city, country, lat, lng, type, iata, icao, ibnr, unlocode, is_system_seed, created_at, updated_at
           FROM ${SEED_ALIAS}.locations`,
        ),
      );
      await db.run(
        sql.raw(
          `INSERT INTO main.operators
             (id, name, code, modes, country, logo_path, is_system_seed, created_at, updated_at)
           SELECT
             id, name, code, modes, country, logo_path, is_system_seed, created_at, updated_at
           FROM ${SEED_ALIAS}.operators`,
        ),
      );
      await db.run(
        sql.raw(
          `INSERT INTO main.vehicles
             (id, mode, code, category, manufacturer, model, capacity, is_system_seed, created_at, updated_at)
           SELECT
             id, mode, code, category, manufacturer, model, capacity, is_system_seed, created_at, updated_at
           FROM ${SEED_ALIAS}.vehicles`,
        ),
      );

      await db.run(sql.raw('COMMIT'));
    } catch (err) {
      try {
        await db.run(sql.raw('ROLLBACK'));
      } catch {
        // best-effort: a failed ROLLBACK still leaves us with the original
        // state because the partial writes never reached visible state.
      }
      throw err;
    }
  } finally {
    try {
      await db.run(sql.raw(`DETACH DATABASE ${SEED_ALIAS}`));
    } catch {
      // detach failures are not fatal — the next launch retries.
    }
  }

  // Only update the version pointer once the data is durably committed.
  await storage.setItem(SEED_VERSION_KEY, SEED_VERSION);

  const [locCount, opCount, vehCount] = await Promise.all([
    db.select({ id: locations.id }).from(locations).where(eq(locations.isSystemSeed, true)),
    db.select({ id: operators.id }).from(operators).where(eq(operators.isSystemSeed, true)),
    db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.isSystemSeed, true)),
  ]);

  return {
    loaded: true,
    reason,
    counts: {
      locations: locCount.length,
      operators: opCount.length,
      vehicles: vehCount.length,
    },
  };
}
