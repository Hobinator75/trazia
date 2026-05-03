// Placeholder — implemented in Block 4 of the launch-fix session.
// This stub mirrors the destructive (non-transactional) behaviour of
// the current restoreFromBackup() in src/lib/backup/index.ts so the
// reproduction test in src/__tests__/launch-blockers.test.ts fails
// today — after Block 4 lands a transactional version, it will pass.
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
import type { DbSnapshot } from '@/lib/export/snapshot';

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

export type RestoreFail = {
  ok: false;
  reason: 'invalid-snapshot' | 'transaction-failed';
  errors?: string[];
  message?: string;
};

export async function restoreFromSnapshot(
  db: DrizzleDb,
  snapshot: DbSnapshot,
): Promise<RestoreOk | RestoreFail> {
  // Mirror the destructive ordering of src/lib/backup/index.ts so the
  // reproduction test exercises the actual bug shape.
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

  try {
    if (snapshot.locations.length > 0) await db.insert(locations).values(snapshot.locations);
    if (snapshot.operators.length > 0) await db.insert(operators).values(snapshot.operators);
    if (snapshot.vehicles.length > 0) await db.insert(vehicles).values(snapshot.vehicles);
    if (snapshot.journeys.length > 0) await db.insert(journeys).values(snapshot.journeys);
    if (snapshot.journeyCompanions.length > 0)
      await db.insert(journeyCompanions).values(snapshot.journeyCompanions);
    if (snapshot.journeyTags.length > 0)
      await db.insert(journeyTags).values(snapshot.journeyTags);
    if (snapshot.journeyPhotos.length > 0)
      await db.insert(journeyPhotos).values(snapshot.journeyPhotos);
    if (snapshot.trips.length > 0) await db.insert(trips).values(snapshot.trips);
    if (snapshot.tripJourneys.length > 0)
      await db.insert(tripJourneys).values(snapshot.tripJourneys);
    if (snapshot.achievementUnlocks.length > 0)
      await db.insert(achievementUnlocks).values(snapshot.achievementUnlocks);
  } catch (err) {
    return {
      ok: false,
      reason: 'transaction-failed',
      message: err instanceof Error ? err.message : String(err),
    };
  }

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
}
