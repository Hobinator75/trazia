import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getLocationById,
  getLocationByIata,
  getLocationByIcao,
  searchLocations,
} from '../repositories/location.repository';
import { locations } from '../schema';
import { createTestDb } from './test-db';

describe('location.repository', () => {
  let handle: ReturnType<typeof createTestDb>;

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
        name: 'Berlin Brandenburg Airport',
        city: 'Berlin',
        country: 'DE',
        lat: 52.3667,
        lng: 13.5033,
        type: 'airport',
        iata: 'BER',
        icao: 'EDDB',
        isSystemSeed: true,
      },
      {
        name: 'Berlin Hauptbahnhof',
        city: 'Berlin',
        country: 'DE',
        lat: 52.525,
        lng: 13.3695,
        type: 'train_station',
        ibnr: '8011160',
        isSystemSeed: true,
      },
      {
        name: 'Munich Airport',
        city: 'München',
        country: 'DE',
        lat: 48.3538,
        lng: 11.7861,
        type: 'airport',
        iata: 'MUC',
        icao: 'EDDM',
        isSystemSeed: true,
      },
    ]);
  });

  afterEach(() => {
    handle.close();
  });

  describe('searchLocations', () => {
    it('matches an exact IATA code first', async () => {
      const results = await searchLocations(handle.db, 'FRA');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.iata).toBe('FRA');
    });

    it('matches a partial name (case-insensitive)', async () => {
      const results = await searchLocations(handle.db, 'frank');
      const iatas = results.map((r) => r.iata);
      expect(iatas).toContain('FRA');
    });

    it('returns an empty list on a miss', async () => {
      const results = await searchLocations(handle.db, 'tokyo');
      expect(results).toEqual([]);
    });

    it('returns an empty list for an empty query (no scan)', async () => {
      const results = await searchLocations(handle.db, '   ');
      expect(results).toEqual([]);
    });

    it('filters by location type', async () => {
      const results = await searchLocations(handle.db, 'berlin', 'train_station');
      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe('train_station');
      expect(results[0]?.name).toBe('Berlin Hauptbahnhof');
    });

    it('caps results at 20', async () => {
      const extras = Array.from({ length: 25 }, (_, i) => ({
        name: `Test Field ${i}`,
        lat: 0,
        lng: 0,
        type: 'airport' as const,
        isSystemSeed: false,
      }));
      await handle.db.insert(locations).values(extras);

      const results = await searchLocations(handle.db, 'test field');
      expect(results.length).toBe(20);
    });
  });

  describe('getLocationByIata / Icao', () => {
    it('finds by IATA (uppercase normalization)', async () => {
      const row = await getLocationByIata(handle.db, 'fra');
      expect(row?.name).toBe('Frankfurt Airport');
    });

    it('finds by ICAO (uppercase normalization)', async () => {
      const row = await getLocationByIcao(handle.db, 'eddb');
      expect(row?.name).toBe('Berlin Brandenburg Airport');
    });

    it('returns undefined for an unknown IATA', async () => {
      const row = await getLocationByIata(handle.db, 'ZZZ');
      expect(row).toBeUndefined();
    });

    it('roundtrips via getLocationById', async () => {
      const fra = await getLocationByIata(handle.db, 'FRA');
      expect(fra).toBeDefined();
      const direct = await getLocationById(handle.db, fra!.id);
      expect(direct?.iata).toBe('FRA');
    });
  });
});
