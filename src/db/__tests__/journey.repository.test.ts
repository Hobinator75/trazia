import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createJourney,
  deleteJourney,
  duplicateJourney,
  getJourneyById,
  getJourneyWithRefsById,
  listJourneys,
  updateJourney,
} from '../repositories/journey.repository';
import { achievementUnlocks, locations, operators, vehicles } from '../schema';
import { createTestDb } from './test-db';

const NO_NOTIFY_NO_ADS = {
  evaluateAchievements: true,
  notify: false,
  triggerInterstitial: false,
} as const;

describe('journey.repository', () => {
  let handle: ReturnType<typeof createTestDb>;
  let fraId: string;
  let jfkId: string;
  let lhId: string;
  let b77wId: string;

  beforeEach(async () => {
    handle = createTestDb();
    await handle.db.insert(locations).values([
      {
        name: 'Frankfurt Airport',
        city: 'Frankfurt',
        country: 'DE',
        lat: 50.0379,
        lng: 8.5622,
        type: 'airport',
        iata: 'FRA',
        icao: 'EDDF',
        isSystemSeed: true,
      },
      {
        name: 'JFK',
        city: 'New York',
        country: 'US',
        lat: 40.6413,
        lng: -73.7781,
        type: 'airport',
        iata: 'JFK',
        icao: 'KJFK',
        isSystemSeed: true,
      },
    ]);
    await handle.db.insert(operators).values({
      name: 'Lufthansa',
      code: 'LH',
      modes: ['flight'],
      country: 'DE',
      isSystemSeed: true,
    });
    await handle.db.insert(vehicles).values({
      mode: 'flight',
      code: 'B77W',
      category: 'widebody',
      manufacturer: 'Boeing',
      model: '777-300ER',
      capacity: 396,
      isSystemSeed: true,
    });

    const fra = await handle.db.select().from(locations).where(eq(locations.iata, 'FRA'));
    const jfk = await handle.db.select().from(locations).where(eq(locations.iata, 'JFK'));
    const lh = await handle.db.select().from(operators).where(eq(operators.code, 'LH'));
    const b77w = await handle.db.select().from(vehicles).where(eq(vehicles.code, 'B77W'));
    fraId = fra[0]!.id;
    jfkId = jfk[0]!.id;
    lhId = lh[0]!.id;
    b77wId = b77w[0]!.id;
  });

  afterEach(() => {
    handle.close();
  });

  it('createJourney inserts a row and trackable refs', async () => {
    const journey = await createJourney(
      handle.db,
      {
        mode: 'flight',
        fromLocationId: fraId,
        toLocationId: jfkId,
        date: '2026-04-15',
        operatorId: lhId,
        vehicleId: b77wId,
        cabinClass: 'business',
        distanceKm: 6204,
        durationMinutes: 540,
        isManualEntry: true,
      },
      NO_NOTIFY_NO_ADS,
    );

    expect(journey.id).toBeTruthy();
    expect(journey.distanceKm).toBe(6204);

    const all = await listJourneys(handle.db);
    expect(all).toHaveLength(1);

    const withRefs = await getJourneyWithRefsById(handle.db, journey.id);
    expect(withRefs?.fromLocation?.iata).toBe('FRA');
    expect(withRefs?.toLocation?.iata).toBe('JFK');
    expect(withRefs?.operator?.code).toBe('LH');
    expect(withRefs?.vehicle?.code).toBe('B77W');
  });

  it('updateJourney patches the row and re-runs achievement sync without losing prior unlocks', async () => {
    const journey = await createJourney(
      handle.db,
      {
        mode: 'flight',
        fromLocationId: fraId,
        toLocationId: jfkId,
        date: '2026-04-15',
        distanceKm: 6204,
        durationMinutes: 540,
        isManualEntry: true,
      },
      NO_NOTIFY_NO_ADS,
    );

    // createJourney already triggered the engine; first_journey should now
    // be persisted. We snapshot it so we can assert it survives the update.
    const before = await handle.db.select().from(achievementUnlocks);
    expect(before.map((u) => u.achievementId)).toContain('first_journey');
    const firstJourneyUnlock = before.find((u) => u.achievementId === 'first_journey')!;

    const updated = await updateJourney(
      handle.db,
      journey.id,
      { cabinClass: 'first', notes: 'edited' },
      NO_NOTIFY_NO_ADS,
    );

    expect(updated?.cabinClass).toBe('first');
    expect(updated?.notes).toBe('edited');

    // Pre-existing unlocks still there with the same id (engine didn't
    // delete-and-reinsert; the unique index on achievement_id would have
    // raised otherwise).
    const after = await handle.db.select().from(achievementUnlocks);
    expect(after.map((u) => u.achievementId)).toContain('first_journey');
    expect(after.find((u) => u.achievementId === 'first_journey')?.id).toBe(firstJourneyUnlock.id);
  });

  it('deleteJourney removes the row', async () => {
    const journey = await createJourney(
      handle.db,
      {
        mode: 'flight',
        fromLocationId: fraId,
        toLocationId: jfkId,
        date: '2026-04-15',
        isManualEntry: true,
      },
      NO_NOTIFY_NO_ADS,
    );

    await deleteJourney(handle.db, journey.id, NO_NOTIFY_NO_ADS);

    const remaining = await getJourneyById(handle.db, journey.id);
    expect(remaining).toBeUndefined();
  });

  it('duplicateJourney creates a fresh row with the same payload but different id', async () => {
    const original = await createJourney(
      handle.db,
      {
        mode: 'flight',
        fromLocationId: fraId,
        toLocationId: jfkId,
        date: '2026-04-15',
        operatorId: lhId,
        cabinClass: 'business',
        distanceKm: 6204,
        isManualEntry: true,
      },
      NO_NOTIFY_NO_ADS,
    );

    const dup = await duplicateJourney(handle.db, original.id, NO_NOTIFY_NO_ADS);

    expect(dup.id).not.toBe(original.id);
    expect(dup.fromLocationId).toBe(original.fromLocationId);
    expect(dup.toLocationId).toBe(original.toLocationId);
    expect(dup.cabinClass).toBe('business');
    expect(dup.operatorId).toBe(original.operatorId);

    const all = await listJourneys(handle.db);
    expect(all).toHaveLength(2);
  });
});
