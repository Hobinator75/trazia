import { desc, eq } from 'drizzle-orm';

import { recalculateAchievements } from '@/lib/achievements/sync';

import {
  journeyCompanions,
  journeyPhotos,
  journeyTags,
  journeys,
  locations,
  operators,
  vehicles,
  type Journey,
  type Location,
  type NewJourney,
  type Operator,
  type Vehicle,
} from '../schema';
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

export interface JourneyWithRefs extends Journey {
  fromLocation: Location | null;
  toLocation: Location | null;
  operator: Operator | null;
  vehicle: Vehicle | null;
}

export async function listJourneysWithRefs(db: DrizzleDb): Promise<JourneyWithRefs[]> {
  const [allJourneys, allLocations, allOperators, allVehicles] = await Promise.all([
    db.select().from(journeys).orderBy(desc(journeys.date)),
    db.select().from(locations),
    db.select().from(operators),
    db.select().from(vehicles),
  ]);

  const locById = new Map(allLocations.map((l) => [l.id, l]));
  const opById = new Map(allOperators.map((o) => [o.id, o]));
  const vehById = new Map(allVehicles.map((v) => [v.id, v]));

  return allJourneys.map((journey) => ({
    ...journey,
    fromLocation: locById.get(journey.fromLocationId) ?? null,
    toLocation: locById.get(journey.toLocationId) ?? null,
    operator: journey.operatorId ? (opById.get(journey.operatorId) ?? null) : null,
    vehicle: journey.vehicleId ? (vehById.get(journey.vehicleId) ?? null) : null,
  }));
}

export async function getJourneyWithRefsById(
  db: DrizzleDb,
  id: string,
): Promise<JourneyWithRefs | undefined> {
  const rows = await listJourneysWithRefs(db);
  return rows.find((j) => j.id === id);
}

export interface JourneyExtras {
  tags: string[];
  companions: string[];
  photoUris: string[];
}

export async function getJourneyExtras(db: DrizzleDb, id: string): Promise<JourneyExtras> {
  const [tags, companions, photos] = await Promise.all([
    db.select().from(journeyTags).where(eq(journeyTags.journeyId, id)),
    db.select().from(journeyCompanions).where(eq(journeyCompanions.journeyId, id)),
    db.select().from(journeyPhotos).where(eq(journeyPhotos.journeyId, id)),
  ]);
  return {
    tags: tags.map((t) => t.tag),
    companions: companions.map((c) => c.companionName),
    photoUris: photos.map((p) => p.photoUri),
  };
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

export async function duplicateJourney(
  db: DrizzleDb,
  id: string,
  opts: JourneyMutationOptions = { evaluateAchievements: true },
): Promise<Journey> {
  const source = await getJourneyById(db, id);
  if (!source) throw new Error(`duplicateJourney: source ${id} not found`);
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = source;
  return createJourney(db, rest as NewJourney, opts);
}
