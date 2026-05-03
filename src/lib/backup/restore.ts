import { sql } from 'drizzle-orm';

import {
  achievementUnlocks,
  journeyCompanions,
  journeyPhotos,
  journeyTags,
  journeys,
  locations,
  operators,
  tripJourneys,
  trips,
  vehicles,
} from '@/db/schema';
import type { DrizzleDb } from '@/db/types';
import { SNAPSHOT_VERSION, type DbSnapshot } from '@/lib/export/snapshot';

export type RestoreOk = {
  ok: true;
  counts: {
    locations: number;
    operators: number;
    vehicles: number;
    journeys: number;
    achievementUnlocks: number;
  };
};

export type RestoreFail =
  | { ok: false; reason: 'invalid-snapshot'; errors: string[] }
  | { ok: false; reason: 'transaction-failed'; message: string };

export interface SnapshotValidation {
  ok: boolean;
  errors: string[];
}

// Sanity-check the snapshot before we touch the live DB. The checks
// stay deliberately simple — version, shape, foreign-key reachability,
// duplicate primary keys. A failed snapshot bails out before the
// destructive phase, so the user's data survives a malformed file.
export function validateSnapshot(snapshot: unknown): SnapshotValidation {
  const errors: string[] = [];

  if (typeof snapshot !== 'object' || snapshot === null) {
    return { ok: false, errors: ['Snapshot is not an object'] };
  }
  const s = snapshot as Partial<DbSnapshot>;

  if (s.version !== SNAPSHOT_VERSION) {
    errors.push(`Unsupported snapshot version: ${String(s.version)}`);
  }

  const arrays: (keyof DbSnapshot)[] = [
    'locations',
    'operators',
    'vehicles',
    'journeys',
    'journeyCompanions',
    'journeyTags',
    'journeyPhotos',
    'trips',
    'tripJourneys',
    'achievementUnlocks',
  ];
  for (const key of arrays) {
    if (!Array.isArray(s[key])) errors.push(`Missing or non-array field: ${key}`);
  }
  if (errors.length > 0) return { ok: false, errors };

  const snap = s as DbSnapshot;
  const locationIds = new Set(snap.locations.map((l) => l.id));
  const operatorIds = new Set(snap.operators.map((o) => o.id));
  const vehicleIds = new Set(snap.vehicles.map((v) => v.id));
  const journeyIds = new Set(snap.journeys.map((j) => j.id));
  const tripIds = new Set(snap.trips.map((t) => t.id));

  if (locationIds.size !== snap.locations.length) {
    errors.push('Duplicate location IDs in snapshot');
  }
  if (operatorIds.size !== snap.operators.length) {
    errors.push('Duplicate operator IDs in snapshot');
  }
  if (vehicleIds.size !== snap.vehicles.length) {
    errors.push('Duplicate vehicle IDs in snapshot');
  }
  if (journeyIds.size !== snap.journeys.length) {
    errors.push('Duplicate journey IDs in snapshot');
  }

  for (const j of snap.journeys) {
    if (!locationIds.has(j.fromLocationId)) {
      errors.push(`journey ${j.id} references missing fromLocation ${j.fromLocationId}`);
    }
    if (!locationIds.has(j.toLocationId)) {
      errors.push(`journey ${j.id} references missing toLocation ${j.toLocationId}`);
    }
    if (j.operatorId && !operatorIds.has(j.operatorId)) {
      errors.push(`journey ${j.id} references missing operator ${j.operatorId}`);
    }
    if (j.vehicleId && !vehicleIds.has(j.vehicleId)) {
      errors.push(`journey ${j.id} references missing vehicle ${j.vehicleId}`);
    }
  }

  for (const tj of snap.tripJourneys) {
    if (!tripIds.has(tj.tripId)) errors.push(`trip_journey references missing trip ${tj.tripId}`);
    if (!journeyIds.has(tj.journeyId)) {
      errors.push(`trip_journey references missing journey ${tj.journeyId}`);
    }
  }
  for (const jc of snap.journeyCompanions) {
    if (!journeyIds.has(jc.journeyId)) {
      errors.push(`journey_companion references missing journey ${jc.journeyId}`);
    }
  }
  for (const jt of snap.journeyTags) {
    if (!journeyIds.has(jt.journeyId)) {
      errors.push(`journey_tag references missing journey ${jt.journeyId}`);
    }
  }
  for (const jp of snap.journeyPhotos) {
    if (!journeyIds.has(jp.journeyId)) {
      errors.push(`journey_photo references missing journey ${jp.journeyId}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

// Wipe + replay the snapshot inside one SQLite transaction. Drizzle's
// expo-sqlite driver doesn't support the `db.transaction(fn)` helper
// reliably across versions, so we drive BEGIN / COMMIT / ROLLBACK
// manually. Either everything from the snapshot lands, or nothing
// changes — even if an INSERT mid-stream throws (broken FK, duplicate
// key, disk pressure).
export async function restoreFromSnapshot(
  db: DrizzleDb,
  snapshot: DbSnapshot,
): Promise<RestoreOk | RestoreFail> {
  const validation = validateSnapshot(snapshot);
  if (!validation.ok) {
    return { ok: false, reason: 'invalid-snapshot', errors: validation.errors };
  }

  await db.run(sql.raw('BEGIN TRANSACTION'));
  try {
    // Order matters: child tables first (so foreign-key cascades stay
    // sensible), then parents. Insert in reverse: parents first.
    await db.delete(journeyPhotos);
    await db.delete(journeyTags);
    await db.delete(journeyCompanions);
    await db.delete(tripJourneys);
    await db.delete(trips);
    await db.delete(achievementUnlocks);
    await db.delete(journeys);
    await db.delete(operators);
    await db.delete(vehicles);
    await db.delete(locations);

    if (snapshot.locations.length > 0) await db.insert(locations).values(snapshot.locations);
    if (snapshot.operators.length > 0) await db.insert(operators).values(snapshot.operators);
    if (snapshot.vehicles.length > 0) await db.insert(vehicles).values(snapshot.vehicles);
    if (snapshot.journeys.length > 0) await db.insert(journeys).values(snapshot.journeys);
    if (snapshot.journeyCompanions.length > 0) {
      await db.insert(journeyCompanions).values(snapshot.journeyCompanions);
    }
    if (snapshot.journeyTags.length > 0) {
      await db.insert(journeyTags).values(snapshot.journeyTags);
    }
    if (snapshot.journeyPhotos.length > 0) {
      await db.insert(journeyPhotos).values(snapshot.journeyPhotos);
    }
    if (snapshot.trips.length > 0) await db.insert(trips).values(snapshot.trips);
    if (snapshot.tripJourneys.length > 0) {
      await db.insert(tripJourneys).values(snapshot.tripJourneys);
    }
    if (snapshot.achievementUnlocks.length > 0) {
      await db.insert(achievementUnlocks).values(snapshot.achievementUnlocks);
    }

    await db.run(sql.raw('COMMIT'));
    return {
      ok: true,
      counts: {
        locations: snapshot.locations.length,
        operators: snapshot.operators.length,
        vehicles: snapshot.vehicles.length,
        journeys: snapshot.journeys.length,
        achievementUnlocks: snapshot.achievementUnlocks.length,
      },
    };
  } catch (err) {
    try {
      await db.run(sql.raw('ROLLBACK'));
    } catch {
      // best-effort: even if ROLLBACK fails (already-aborted tx), the
      // outer error is the one that matters to the caller.
    }
    return {
      ok: false,
      reason: 'transaction-failed',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
