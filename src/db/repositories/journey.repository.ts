import { desc, eq } from 'drizzle-orm';

import { recalculateAchievements } from '@/lib/achievements/sync';

import { type Journey, journeys, type NewJourney } from '../schema';
import type { DrizzleDb } from '../types';

const uuid = () => globalThis.crypto.randomUUID();

export interface JourneyMutationOptions {
  evaluateAchievements?: boolean;
  notify?: boolean;
}

export async function listJourneys(db: DrizzleDb): Promise<Journey[]> {
  return db.select().from(journeys).orderBy(desc(journeys.date));
}

export async function getJourneyById(db: DrizzleDb, id: string): Promise<Journey | undefined> {
  const rows = await db.select().from(journeys).where(eq(journeys.id, id)).limit(1);
  return rows[0];
}

export async function createJourney(
  db: DrizzleDb,
  value: NewJourney,
  opts: JourneyMutationOptions = { evaluateAchievements: true },
): Promise<Journey> {
  const id = value.id ?? uuid();
  await db.insert(journeys).values({ ...value, id });
  if (opts.evaluateAchievements !== false) {
    await recalculateAchievements(db, {
      triggeringJourneyId: id,
      ...(opts.notify !== undefined ? { notify: opts.notify } : {}),
    });
  }
  const created = await getJourneyById(db, id);
  if (!created) throw new Error(`createJourney failed for ${id}`);
  return created;
}

export async function updateJourney(
  db: DrizzleDb,
  id: string,
  patch: Partial<NewJourney>,
  opts: JourneyMutationOptions = { evaluateAchievements: true },
): Promise<Journey | undefined> {
  await db.update(journeys).set(patch).where(eq(journeys.id, id));
  if (opts.evaluateAchievements !== false) {
    await recalculateAchievements(db, {
      triggeringJourneyId: id,
      ...(opts.notify !== undefined ? { notify: opts.notify } : {}),
    });
  }
  return getJourneyById(db, id);
}

export async function deleteJourney(
  db: DrizzleDb,
  id: string,
  opts: JourneyMutationOptions = { evaluateAchievements: true },
): Promise<void> {
  await db.delete(journeys).where(eq(journeys.id, id));
  if (opts.evaluateAchievements !== false) {
    await recalculateAchievements(db, {
      ...(opts.notify !== undefined ? { notify: opts.notify } : {}),
    });
  }
}
