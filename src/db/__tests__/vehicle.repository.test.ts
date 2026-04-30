import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getVehicleById,
  getVehicleByCode,
  searchVehicles,
} from '../repositories/vehicle.repository';
import { vehicles } from '../schema';
import { createTestDb } from './test-db';

describe('vehicle.repository', () => {
  let handle: ReturnType<typeof createTestDb>;

  beforeEach(async () => {
    handle = createTestDb();
    await handle.db.insert(vehicles).values([
      {
        mode: 'flight',
        code: 'B738',
        manufacturer: 'Boeing',
        model: '737-800',
        category: 'narrowbody',
        capacity: 189,
        isSystemSeed: true,
      },
      {
        mode: 'flight',
        code: 'A320',
        manufacturer: 'Airbus',
        model: 'A320',
        category: 'narrowbody',
        capacity: 180,
        isSystemSeed: true,
      },
      {
        mode: 'flight',
        code: 'A359',
        manufacturer: 'Airbus',
        model: 'A350-900',
        category: 'widebody',
        capacity: 325,
        isSystemSeed: true,
      },
      {
        mode: 'train',
        code: 'ICE3',
        manufacturer: 'Siemens',
        model: 'Velaro D',
        category: 'high-speed',
        capacity: 460,
        isSystemSeed: true,
      },
    ]);
  });

  afterEach(() => {
    handle.close();
  });

  describe('searchVehicles', () => {
    it('matches by exact code', async () => {
      const results = await searchVehicles(handle.db, 'B738');
      expect(results[0]?.code).toBe('B738');
    });

    it('matches by partial manufacturer', async () => {
      const results = await searchVehicles(handle.db, 'airbus');
      const codes = results.map((r) => r.code).sort();
      expect(codes).toContain('A320');
      expect(codes).toContain('A359');
    });

    it('returns empty on miss', async () => {
      const results = await searchVehicles(handle.db, 'concorde');
      expect(results).toEqual([]);
    });

    it('filters by transport mode', async () => {
      const trains = await searchVehicles(handle.db, 'velaro', 'train');
      expect(trains).toHaveLength(1);
      expect(trains[0]?.code).toBe('ICE3');

      const flights = await searchVehicles(handle.db, 'velaro', 'flight');
      expect(flights).toEqual([]);
    });
  });

  describe('getters', () => {
    it('finds by code (case-insensitive normalization)', async () => {
      const row = await getVehicleByCode(handle.db, 'b738');
      expect(row?.model).toBe('737-800');
    });

    it('returns undefined for an unknown code', async () => {
      const row = await getVehicleByCode(handle.db, 'ZZZZ');
      expect(row).toBeUndefined();
    });

    it('roundtrips via getVehicleById', async () => {
      const a320 = await getVehicleByCode(handle.db, 'A320');
      expect(a320).toBeDefined();
      const byId = await getVehicleById(handle.db, a320!.id);
      expect(byId?.code).toBe('A320');
    });
  });
});
