import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { achievements, type Achievement, type NewAchievement } from '@/db/schema';

export const achievementRepository = {
  async list(): Promise<Achievement[]> {
    return db.select().from(achievements);
  },

  async getByCode(code: string): Promise<Achievement | undefined> {
    const rows = await db.select().from(achievements).where(eq(achievements.code, code)).limit(1);
    return rows[0];
  },

  async upsert(value: NewAchievement): Promise<void> {
    await db
      .insert(achievements)
      .values(value)
      .onConflictDoUpdate({ target: achievements.code, set: value });
  },
};
