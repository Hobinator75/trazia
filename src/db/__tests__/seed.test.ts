import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  SEED_VERSION,
  SEED_VERSION_KEY,
  type SeedDataset,
  seedFromStatic,
  type SeedStorage,
} from '../seed/seedFromStatic';
import { locations, operators, vehicles } from '../schema';
import { createTestDb } from './test-db';

class MemoryStorage implements SeedStorage {
  private data = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }
}

const TEST_DATA: SeedDataset = {
  airports: [
    {
      iata: 'FRA',
      icao: 'EDDF',
      name: 'Frankfurt Airport',
      city: 'Frankfurt',
      country: 'DE',
      lat: 50.0379,
      lng: 8.5622,
    },
    {
      iata: 'LHR',
      icao: 'EGLL',
      name: 'London Heathrow',
      city: 'London',
      country: 'GB',
      lat: 51.47,
      lng: -0.4543,
    },
  ],
  airlines: [
    { iata: 'LH', icao: 'DLH', name: 'Lufthansa', country: 'DE' },
    { iata: 'BA', icao: 'BAW', name: 'British Airways', country: 'GB' },
  ],
  aircraft: [
    {
      code: 'B738',
      manufacturer: 'Boeing',
      model: '737-800',
      category: 'narrowbody',
      capacity: 189,
    },
    {
      code: 'A320',
      manufacturer: 'Airbus',
      model: 'A320',
      category: 'narrowbody',
      capacity: 180,
    },
  ],
  trainStations: [
    {
      ibnr: '8011160',
      name: 'Berlin Hbf',
      city: 'Berlin',
      country: 'DE',
      lat: 52.5251,
      lng: 13.3694,
    },
    {
      ibnr: '8000261',
      name: 'München Hbf',
      city: 'München',
      country: 'DE',
      lat: 48.1402,
      lng: 11.5586,
    },
  ],
  railwayOperators: [
    { code: 'DB', name: 'Deutsche Bahn', country: 'DE', modes: ['train'] },
    { code: 'OBB', name: 'ÖBB', country: 'AT', modes: ['train'] },
  ],
  trains: [
    {
      code: 'ICE4',
      manufacturer: 'Siemens / Bombardier',
      model: 'ICE 4 (BR 412)',
      category: 'highspeed',
    },
  ],
};

describe('seedFromStatic', () => {
  let handle: ReturnType<typeof createTestDb>;
  let storage: MemoryStorage;

  beforeEach(() => {
    handle = createTestDb();
    storage = new MemoryStorage();
  });

  afterEach(() => {
    handle.close();
  });

  it('inserts on a fresh install and writes seed.version', async () => {
    const result = await seedFromStatic({ db: handle.db, storage, data: TEST_DATA });

    expect(result.inserted).toBe(true);
    expect(result.reason).toBe('fresh-install');
    // 2 airports + 2 train stations = 4 locations
    // 2 airlines + 2 railway operators = 4 operators
    // 2 aircraft + 1 train = 3 vehicles
    expect(result.counts).toEqual({ locations: 4, operators: 4, vehicles: 3 });
    expect(await storage.getItem(SEED_VERSION_KEY)).toBe(SEED_VERSION);

    const locs = await handle.db.select().from(locations);
    expect(locs).toHaveLength(4);
    expect(locs.every((row) => row.isSystemSeed)).toBe(true);
    expect(locs.find((l) => l.iata === 'FRA')).toBeDefined();
    expect(locs.find((l) => l.ibnr === '8011160')?.type).toBe('train_station');

    const ops = await handle.db.select().from(operators);
    expect(ops.find((o) => o.code === 'LH')?.modes).toEqual(['flight']);
    expect(ops.find((o) => o.code === 'DB')?.modes).toEqual(['train']);

    const veh = await handle.db.select().from(vehicles);
    expect(veh.find((v) => v.code === 'B738')?.mode).toBe('flight');
    expect(veh.find((v) => v.code === 'ICE4')?.mode).toBe('train');
    expect(veh.find((v) => v.code === 'ICE4')?.category).toBe('highspeed');
  });

  it('is idempotent: a second run with the same version skips insertion', async () => {
    await seedFromStatic({ db: handle.db, storage, data: TEST_DATA });
    const second = await seedFromStatic({ db: handle.db, storage, data: TEST_DATA });

    expect(second.inserted).toBe(false);
    expect(second.reason).toBe('up-to-date');

    const locs = await handle.db.select().from(locations);
    expect(locs).toHaveLength(TEST_DATA.airports.length + TEST_DATA.trainStations.length);
  });

  it('self-heals when seed.version is set but the table is empty (post-reset)', async () => {
    await storage.setItem(SEED_VERSION_KEY, SEED_VERSION);

    const result = await seedFromStatic({ db: handle.db, storage, data: TEST_DATA });

    expect(result.inserted).toBe(true);
    expect(result.reason).toBe('self-heal');

    const locs = await handle.db.select().from(locations);
    expect(locs.length).toBeGreaterThan(0);
  });

  it('upgrade adds new system rows but keeps user data and existing system rows', async () => {
    // Simulate a device on an older seed version: one system airport (FRA)
    // and one user-created location are already present.
    await storage.setItem(SEED_VERSION_KEY, '1');
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
        name: 'My private airfield',
        lat: 0,
        lng: 0,
        type: 'airport',
        isSystemSeed: false,
      },
    ]);

    // Re-seed with TEST_DATA (FRA + LHR airports, 2 train stations).
    const result = await seedFromStatic({ db: handle.db, storage, data: TEST_DATA });
    expect(result.inserted).toBe(true);
    expect(result.reason).toBe('version-upgrade');
    // 1 new airport (LHR) + 2 new stations = 3 location inserts.
    expect(result.counts.locations).toBe(3);

    const allRows = await handle.db.select().from(locations);
    expect(allRows.map((r) => r.name).sort()).toEqual([
      'Berlin Hbf',
      'Frankfurt Airport',
      'London Heathrow',
      'My private airfield',
      'München Hbf',
    ]);

    // The user row is preserved.
    const userRows = allRows.filter((r) => !r.isSystemSeed);
    expect(userRows).toHaveLength(1);
    expect(userRows[0]?.name).toBe('My private airfield');

    // FRA row is preserved (same id), not duplicated.
    const fraRows = allRows.filter((r) => r.iata === 'FRA');
    expect(fraRows).toHaveLength(1);

    // Version is now bumped.
    expect(await storage.getItem(SEED_VERSION_KEY)).toBe(SEED_VERSION);
  });

  it('keeps user-created rows untouched (only seeds isSystemSeed=true rows)', async () => {
    await handle.db.insert(locations).values({
      name: 'My private airfield',
      lat: 0,
      lng: 0,
      type: 'airport',
      isSystemSeed: false,
    });

    await seedFromStatic({ db: handle.db, storage, data: TEST_DATA });

    const userRows = await handle.db
      .select()
      .from(locations)
      .where(eq(locations.isSystemSeed, false));
    expect(userRows).toHaveLength(1);
    expect(userRows[0]?.name).toBe('My private airfield');

    const seededRows = await handle.db
      .select()
      .from(locations)
      .where(eq(locations.isSystemSeed, true));
    expect(seededRows).toHaveLength(
      TEST_DATA.airports.length + TEST_DATA.trainStations.length,
    );
  });
});
