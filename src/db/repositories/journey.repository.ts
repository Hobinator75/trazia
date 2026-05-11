import { desc, eq, sql } from 'drizzle-orm';

import { recalculateAchievements } from '@/lib/achievements/sync';
import { randomUUID } from '@/lib/uuid';

// `interstitialController` and `analytics` are loaded lazily inside the
// mutation paths because their transitive deps include `react-native`. Top-
// level imports here would force vitest (a Node environment) to parse the
// RN entry, which fails on Flow syntax. Production builds short-circuit
// these `import()` calls via Metro's tree-shaker, so there is no runtime
// cost. The same lazy-loading pattern is used in lib/observability/sentry.

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

const uuid = () => randomUUID();

export interface JourneyMutationOptions {
  evaluateAchievements?: boolean;
  notify?: boolean;
  // Repository-side ad-trigger is enabled by default. Tests opt out so they
  // never load the native AdMob module.
  triggerInterstitial?: boolean;
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
  if (opts.triggerInterstitial !== false) {
    void import('@/lib/ads/interstitialController').then((mod) => mod.onJourneyCreated());
  }
  const created = await getJourneyById(db, id);
  if (!created) throw new Error(`createJourney failed for ${id}`);
  void import('@/lib/observability/analytics').then((mod) => mod.trackJourneyAdded(created.mode));
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

export interface JourneyExtrasInput {
  tags: readonly string[];
  companions: readonly string[];
  photoUris: readonly string[];
}

export interface SaveJourneyOptions extends JourneyMutationOptions {
  editing?: boolean;
  journeyId?: string;
}

// Atomic save path used by FlightForm/TrainForm/OtherForm. Wraps the
// journey row mutation and the child-collection delete+insert in a
// single SQLite transaction so either everything lands or nothing
// does. Achievement recalc and ad-trigger run *after* commit on
// purpose: the recalc is itself a multi-row mutation with its own
// idempotent migration log, and we don't want to roll back a
// successful journey insert just because the unlock evaluation
// hiccuped (the unlock state stays internally consistent via its own
// uniqueness constraints).
export async function saveJourneyWithExtras(
  db: DrizzleDb,
  patch: NewJourney,
  extras: JourneyExtrasInput,
  opts: SaveJourneyOptions = { evaluateAchievements: true },
): Promise<{ id: string }> {
  const editing = opts.editing === true;
  if (editing && !opts.journeyId) {
    throw new Error('saveJourneyWithExtras: editing=true requires journeyId');
  }

  const targetId = editing ? opts.journeyId! : (patch.id ?? uuid());

  await db.run(sql.raw('BEGIN TRANSACTION'));
  try {
    if (editing) {
      await db.update(journeys).set(patch).where(eq(journeys.id, targetId));
      await db.delete(journeyCompanions).where(eq(journeyCompanions.journeyId, targetId));
      await db.delete(journeyTags).where(eq(journeyTags.journeyId, targetId));
      await db.delete(journeyPhotos).where(eq(journeyPhotos.journeyId, targetId));
    } else {
      await db.insert(journeys).values({ ...patch, id: targetId });
    }

    if (extras.companions.length > 0) {
      await db
        .insert(journeyCompanions)
        .values(extras.companions.map((name) => ({ journeyId: targetId, companionName: name })));
    }
    if (extras.tags.length > 0) {
      await db.insert(journeyTags).values(extras.tags.map((tag) => ({ journeyId: targetId, tag })));
    }
    if (extras.photoUris.length > 0) {
      await db
        .insert(journeyPhotos)
        .values(extras.photoUris.map((photoUri) => ({ journeyId: targetId, photoUri })));
    }

    await db.run(sql.raw('COMMIT'));
  } catch (err) {
    try {
      await db.run(sql.raw('ROLLBACK'));
    } catch {
      // best-effort: the original error is what callers care about.
    }
    throw err;
  }

  // Post-commit side-effects. Failures here do NOT roll back the
  // journey — they affect derived state (achievement unlocks, ad
  // pacing, analytics) that recalculate idempotently on next access.
  if (opts.evaluateAchievements !== false) {
    await recalculateAchievements(db, {
      triggeringJourneyId: targetId,
      ...(opts.notify !== undefined ? { notify: opts.notify } : {}),
    });
  }
  if (!editing && opts.triggerInterstitial !== false) {
    void import('@/lib/ads/interstitialController').then((mod) => mod.onJourneyCreated());
  }
  if (!editing) {
    void import('@/lib/observability/analytics').then((mod) => mod.trackJourneyAdded(patch.mode));
  }

  return { id: targetId };
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
