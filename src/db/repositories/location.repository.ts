import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { locations, type Location, type NewLocation } from '@/db/schema';

export const locationRepository = {
  async list(): Promise<Location[]> {
    return db.select().from(locations);
  },

  async getById(id: string): Promise<Location | undefined> {
    const rows = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
    return rows[0];
  },

  async upsert(value: NewLocation): Promise<void> {
    await db
      .insert(locations)
      .values(value)
      .onConflictDoUpdate({ target: locations.id, set: value });
  },
};
