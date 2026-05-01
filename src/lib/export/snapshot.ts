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
  type AchievementUnlock,
  type Journey,
  type JourneyCompanion,
  type JourneyPhoto,
  type JourneyTag,
  type Location,
  type Operator,
  type Trip,
  type TripJourney,
  type Vehicle,
} from '@/db/schema';
import type { DrizzleDb } from '@/db/types';

export const SNAPSHOT_VERSION = 1;

export interface DbSnapshot {
  version: number;
  exportedAt: string;
  locations: Location[];
  operators: Operator[];
  vehicles: Vehicle[];
  journeys: Journey[];
  journeyCompanions: JourneyCompanion[];
  journeyTags: JourneyTag[];
  journeyPhotos: JourneyPhoto[];
  trips: Trip[];
  tripJourneys: TripJourney[];
  achievementUnlocks: AchievementUnlock[];
}

export async function buildDbSnapshot(db: DrizzleDb): Promise<DbSnapshot> {
  const [
    allLocations,
    allOperators,
    allVehicles,
    allJourneys,
    allCompanions,
    allTags,
    allPhotos,
    allTrips,
    allTripJourneys,
    allUnlocks,
  ] = await Promise.all([
    db.select().from(locations),
    db.select().from(operators),
    db.select().from(vehicles),
    db.select().from(journeys),
    db.select().from(journeyCompanions),
    db.select().from(journeyTags),
    db.select().from(journeyPhotos),
    db.select().from(trips),
    db.select().from(tripJourneys),
    db.select().from(achievementUnlocks),
  ]);

  return {
    version: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    locations: allLocations,
    operators: allOperators,
    vehicles: allVehicles,
    journeys: allJourneys,
    journeyCompanions: allCompanions,
    journeyTags: allTags,
    journeyPhotos: allPhotos,
    trips: allTrips,
    tripJourneys: allTripJourneys,
    achievementUnlocks: allUnlocks,
  };
}
