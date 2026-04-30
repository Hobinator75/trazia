import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { achievementUnlocks, type AchievementUnlock, type NewAchievementUnlock } from '@/db/schema';

export const achievementUnlockRepository = {
  async list(): Promise<AchievementUnlock[]> {
    return db.select().from(achievementUnlocks);
  },

  async getByAchievementId(achievementId: string): Promise<AchievementUnlock | undefined> {
    const rows = await db
      .select()
      .from(achievementUnlocks)
      .where(eq(achievementUnlocks.achievementId, achievementId))
      .limit(1);
    return rows[0];
  },

  async upsert(value: NewAchievementUnlock): Promise<void> {
    await db
      .insert(achievementUnlocks)
      .values(value)
      .onConflictDoUpdate({ target: achievementUnlocks.achievementId, set: value });
  },
};
