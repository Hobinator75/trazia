import { desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { journeys, type Journey, type NewJourney } from '@/db/schema';

export const journeyRepository = {
  async list(): Promise<Journey[]> {
    return db.select().from(journeys).orderBy(desc(journeys.departedAt));
  },

  async getById(id: string): Promise<Journey | undefined> {
    const rows = await db.select().from(journeys).where(eq(journeys.id, id)).limit(1);
    return rows[0];
  },

  async insert(value: NewJourney): Promise<void> {
    await db.insert(journeys).values(value);
  },

  async remove(id: string): Promise<void> {
    await db.delete(journeys).where(eq(journeys.id, id));
  },
};
