import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
import { createTestDb } from '@/db/__tests__/test-db';

import { buildDbSnapshot, SNAPSHOT_VERSION } from '../snapshot';

describe('buildDbSnapshot + restore roundtrip', () => {
  let handle: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    handle = createTestDb();
  });
  afterEach(() => {
    handle.close();
  });

  it('captures every Trazia table and the version field', async () => {
    await handle.db.insert(locations).values([
      {
        name: 'Frankfurt Airport',
        country: 'DE',
        lat: 50.0379,
        lng: 8.5622,
        type: 'airport',
        iata: 'FRA',
        isSystemSeed: true,
      },
      {
        name: 'JFK',
        country: 'US',
        lat: 40.6413,
        lng: -73.7781,
        type: 'airport',
        iata: 'JFK',
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

    const allLocs = await handle.db.select().from(locations);
    const fra = allLocs.find((l) => l.iata === 'FRA')!;
    const jfk = allLocs.find((l) => l.iata === 'JFK')!;

    const journey = (
      await handle.db
        .insert(journeys)
        .values({
          mode: 'flight',
          fromLocationId: fra.id,
          toLocationId: jfk.id,
          date: '2026-04-15',
          isManualEntry: true,
        })
        .returning()
    )[0]!;
    await handle.db.insert(journeyTags).values({ journeyId: journey.id, tag: 'urlaub' });
    await handle.db.insert(achievementUnlocks).values({
      achievementId: 'first_journey',
      triggeringJourneyId: journey.id,
      unlockedAt: new Date('2026-04-15T00:00:00Z'),
    });

    const snap = await buildDbSnapshot(handle.db);

    expect(snap.version).toBe(SNAPSHOT_VERSION);
    expect(typeof snap.exportedAt).toBe('string');
    expect(snap.locations).toHaveLength(2);
    expect(snap.operators).toHaveLength(1);
    expect(snap.journeys).toHaveLength(1);
    expect(snap.journeyTags).toEqual([
      {
        journeyId: journey.id,
        tag: 'urlaub',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    ]);
    expect(snap.achievementUnlocks).toHaveLength(1);
    expect(snap.trips).toEqual([]);
  });

  it('roundtrips: snapshot, wipe, replay → state matches', async () => {
    await handle.db.insert(locations).values([
      {
        name: 'Frankfurt Airport',
        country: 'DE',
        lat: 50.0379,
        lng: 8.5622,
        type: 'airport',
        iata: 'FRA',
        isSystemSeed: true,
      },
      {
        name: 'JFK',
        country: 'US',
        lat: 40.6413,
        lng: -73.7781,
        type: 'airport',
        iata: 'JFK',
        isSystemSeed: true,
      },
    ]);
    const allLocs = await handle.db.select().from(locations);
    const journey = (
      await handle.db
        .insert(journeys)
        .values({
          mode: 'flight',
          fromLocationId: allLocs[0]!.id,
          toLocationId: allLocs[1]!.id,
          date: '2026-04-15',
          distanceKm: 6204,
          isManualEntry: true,
        })
        .returning()
    )[0]!;

    const snap = await buildDbSnapshot(handle.db);

    // Wipe (same order as backup/index.ts does it).
    await handle.db.delete(journeyPhotos);
    await handle.db.delete(journeyTags);
    await handle.db.delete(journeyCompanions);
    await handle.db.delete(tripJourneys);
    await handle.db.delete(trips);
    await handle.db.delete(achievementUnlocks);
    await handle.db.delete(journeys);
    await handle.db.delete(operators);
    await handle.db.delete(vehicles);
    await handle.db.delete(locations);

    // Replay (same order as backup/index.ts does it).
    if (snap.locations.length > 0) await handle.db.insert(locations).values(snap.locations);
    if (snap.operators.length > 0) await handle.db.insert(operators).values(snap.operators);
    if (snap.vehicles.length > 0) await handle.db.insert(vehicles).values(snap.vehicles);
    if (snap.journeys.length > 0) await handle.db.insert(journeys).values(snap.journeys);
    if (snap.journeyCompanions.length > 0)
      await handle.db.insert(journeyCompanions).values(snap.journeyCompanions);
    if (snap.journeyTags.length > 0) await handle.db.insert(journeyTags).values(snap.journeyTags);
    if (snap.journeyPhotos.length > 0)
      await handle.db.insert(journeyPhotos).values(snap.journeyPhotos);
    if (snap.trips.length > 0) await handle.db.insert(trips).values(snap.trips);
    if (snap.tripJourneys.length > 0)
      await handle.db.insert(tripJourneys).values(snap.tripJourneys);
    if (snap.achievementUnlocks.length > 0)
      await handle.db.insert(achievementUnlocks).values(snap.achievementUnlocks);

    const newLocs = await handle.db.select().from(locations);
    expect(newLocs.map((l) => l.iata).sort()).toEqual(['FRA', 'JFK']);
    const newJourneys = await handle.db.select().from(journeys);
    expect(newJourneys).toHaveLength(1);
    expect(newJourneys[0]?.id).toBe(journey.id);
    expect(newJourneys[0]?.distanceKm).toBe(6204);
  });
});
