import AsyncStorage from '@react-native-async-storage/async-storage';

import { db } from '@/db/client';
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

const ASYNC_STORAGE_KEYS = ['seed.version', 'onboarding.completed', 'upsell.25_journeys_shown'];

// Wipes every row from every Trazia table and clears the AsyncStorage flags
// the app uses for first-run gating. The DB file itself is left in place so
// the migrator doesn't need to re-run on the next launch — drizzle-orm
// preserves the schema. The caller is expected to prompt the user to
// restart the app afterwards because zustand stores in memory still hold
// the previous state.
export async function wipeAllData(): Promise<void> {
  // Order matters because of FK constraints — child tables first.
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

  await AsyncStorage.multiRemove(ASYNC_STORAGE_KEYS);
}
