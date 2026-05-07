import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/__tests__/test-db';
import { journeys, locations, operators, vehicles } from '@/db/schema';

import { seedExampleJourney } from '../seedExampleJourney';

describe('seedExampleJourney', () => {
  let handle: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    handle = createTestDb();
  });

  afterEach(() => {
    handle.close();
  });

  const seedAirports = async () => {
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
  };

  const seedLufthansa = async () => {
    await handle.db.insert(operators).values({
      name: 'Lufthansa',
      code: 'LH',
      modes: ['flight'],
      country: 'DE',
      isSystemSeed: true,
    });
  };

  const seedA350 = async () => {
    await handle.db.insert(vehicles).values({
      mode: 'flight',
      code: 'A359',
      category: 'widebody',
      manufacturer: 'Airbus',
      model: 'A350-900',
      capacity: 325,
      isSystemSeed: true,
    });
  };

  it('creates the example journey with operator and vehicle when both seeds exist', async () => {
    await seedAirports();
    await seedLufthansa();
    await seedA350();

    const result = await seedExampleJourney(handle.db);

    expect(result.status).toBe('created');
    expect(result.operatorAttached).toBe(true);
    expect(result.vehicleAttached).toBe(true);

    const rows = await handle.db.select().from(journeys);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.mode).toBe('flight');
    expect(rows[0]?.operatorId).not.toBeNull();
    expect(rows[0]?.vehicleId).not.toBeNull();
    expect(rows[0]?.distanceKm).toBeGreaterThan(6000);
    expect(rows[0]?.distanceKm).toBeLessThan(7000);
  });

  it('still creates the journey with operatorId=null when LH seed is missing', async () => {
    await seedAirports();
    await seedA350();

    const result = await seedExampleJourney(handle.db);

    expect(result.status).toBe('created');
    expect(result.operatorAttached).toBe(false);
    expect(result.vehicleAttached).toBe(true);

    const rows = await handle.db.select().from(journeys);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.operatorId).toBeNull();
    expect(rows[0]?.vehicleId).not.toBeNull();
  });

  it('still creates the journey with vehicleId=null when A359 seed is missing', async () => {
    await seedAirports();
    await seedLufthansa();

    const result = await seedExampleJourney(handle.db);

    expect(result.status).toBe('created');
    expect(result.operatorAttached).toBe(true);
    expect(result.vehicleAttached).toBe(false);

    const rows = await handle.db.select().from(journeys);
    expect(rows[0]?.operatorId).not.toBeNull();
    expect(rows[0]?.vehicleId).toBeNull();
  });

  it('still creates the journey when both operator AND vehicle are missing', async () => {
    await seedAirports();

    const result = await seedExampleJourney(handle.db);

    expect(result.status).toBe('created');
    expect(result.operatorAttached).toBe(false);
    expect(result.vehicleAttached).toBe(false);

    const rows = await handle.db.select().from(journeys);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.operatorId).toBeNull();
    expect(rows[0]?.vehicleId).toBeNull();
  });

  it('reports missing-airports and inserts nothing when FRA is absent', async () => {
    await handle.db.insert(locations).values({
      name: 'JFK',
      country: 'US',
      lat: 40.6413,
      lng: -73.7781,
      type: 'airport',
      iata: 'JFK',
      isSystemSeed: true,
    });

    const result = await seedExampleJourney(handle.db);

    expect(result.status).toBe('missing-airports');
    expect(result.journeyId).toBeUndefined();
    const rows = await handle.db.select().from(journeys);
    expect(rows).toHaveLength(0);
  });

  it('reports missing-airports when JFK is absent', async () => {
    await handle.db.insert(locations).values({
      name: 'Frankfurt Airport',
      country: 'DE',
      lat: 50.0379,
      lng: 8.5622,
      type: 'airport',
      iata: 'FRA',
      isSystemSeed: true,
    });

    const result = await seedExampleJourney(handle.db);

    expect(result.status).toBe('missing-airports');
    const rows = await handle.db.select().from(journeys);
    expect(rows).toHaveLength(0);
  });

  it('uses yesterdays date based on the supplied clock', async () => {
    await seedAirports();
    const fixedNow = new Date('2026-05-07T10:00:00Z');

    await seedExampleJourney(handle.db, fixedNow);

    const rows = await handle.db
      .select()
      .from(journeys)
      .where(eq(journeys.source, 'onboarding:example'));
    expect(rows[0]?.date).toBe('2026-05-06');
  });
});
