import { achievementUnlocks, journeys, locations, operators, vehicles } from '@/db/schema';
import type { DrizzleDb } from '@/db/types';
import { useAchievementStore } from '@/stores/achievementStore';

import { evaluateAll } from './engine';
import type {
  Achievement,
  AchievementContext,
  AchievementUnlock as AchievementUnlockEntity,
  UnlockResult,
} from './types';

export interface RecalculateOptions {
  triggeringJourneyId?: string;
  achievements?: Achievement[];
  notify?: boolean;
}

export async function recalculateAchievements(
  db: DrizzleDb,
  opts: RecalculateOptions = {},
): Promise<UnlockResult[]> {
  const [allJourneys, existingUnlocks, allLocations, allOperators, allVehicles] = await Promise.all(
    [
      db.select().from(journeys),
      db.select().from(achievementUnlocks),
      db.select().from(locations),
      db.select().from(operators),
      db.select().from(vehicles),
    ],
  );

  const ctx: AchievementContext = {
    allJourneys,
    allUnlocks: existingUnlocks.map(
      (u): AchievementUnlockEntity => ({
        id: u.id,
        achievementId: u.achievementId,
        unlockedAt: u.unlockedAt,
        triggeringJourneyId: u.triggeringJourneyId,
      }),
    ),
    locationsById: new Map(allLocations.map((l) => [l.id, l])),
    operatorsById: new Map(allOperators.map((o) => [o.id, o])),
    vehiclesById: new Map(allVehicles.map((v) => [v.id, v])),
    ...(opts.triggeringJourneyId !== undefined
      ? { triggeringJourneyId: opts.triggeringJourneyId }
      : {}),
  };

  const newUnlocks = opts.achievements ? evaluateAll(ctx, opts.achievements) : evaluateAll(ctx);

  if (newUnlocks.length > 0) {
    await db.insert(achievementUnlocks).values(
      newUnlocks.map((u) => ({
        achievementId: u.achievementId,
        unlockedAt: new Date(u.unlockedAt),
        triggeringJourneyId: u.triggeringJourneyId ?? null,
      })),
    );
    if (opts.notify !== false) {
      useAchievementStore.getState().appendUnlocks(newUnlocks);
    }
    // Lazy-loaded so this module stays import-safe in Node test environments
    // (analytics.ts pulls in `react-native` via AsyncStorage).
    void import('@/lib/observability/analytics').then((mod) => {
      for (const unlock of newUnlocks) void mod.trackAchievementUnlocked(unlock.achievementId);
    });
  }

  return newUnlocks;
}
