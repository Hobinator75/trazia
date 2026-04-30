import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getOperatorById,
  getOperatorByCode,
  searchOperators,
} from '../repositories/operator.repository';
import { operators } from '../schema';
import { createTestDb } from './test-db';

describe('operator.repository', () => {
  let handle: ReturnType<typeof createTestDb>;

  beforeEach(async () => {
    handle = createTestDb();
    await handle.db.insert(operators).values([
      {
        name: 'Lufthansa',
        code: 'LH',
        modes: ['flight'],
        country: 'DE',
        isSystemSeed: true,
      },
      {
        name: 'British Airways',
        code: 'BA',
        modes: ['flight'],
        country: 'GB',
        isSystemSeed: true,
      },
      {
        name: 'Deutsche Bahn',
        code: 'DB',
        modes: ['train'],
        country: 'DE',
        isSystemSeed: true,
      },
      {
        name: 'Stena Line',
        code: 'STENA',
        modes: ['ship'],
        country: 'SE',
        isSystemSeed: true,
      },
    ]);
  });

  afterEach(() => {
    handle.close();
  });

  describe('searchOperators', () => {
    it('matches by exact code', async () => {
      const results = await searchOperators(handle.db, 'LH');
      expect(results[0]?.code).toBe('LH');
    });

    it('matches by partial name', async () => {
      const results = await searchOperators(handle.db, 'british');
      expect(results.map((r) => r.code)).toContain('BA');
    });

    it('returns empty on miss', async () => {
      const results = await searchOperators(handle.db, 'aerolineas');
      expect(results).toEqual([]);
    });

    it('filters by transport mode (JSON-array column)', async () => {
      const flightOps = await searchOperators(handle.db, 'a', 'flight');
      const codes = flightOps.map((r) => r.code).sort();
      expect(codes).toContain('BA');
      expect(codes).toContain('LH');
      expect(codes).not.toContain('DB');

      const trainOps = await searchOperators(handle.db, 'b', 'train');
      expect(trainOps.map((r) => r.code)).toEqual(['DB']);
    });
  });

  describe('getters', () => {
    it('finds by code (case-insensitive normalization)', async () => {
      const row = await getOperatorByCode(handle.db, 'lh');
      expect(row?.name).toBe('Lufthansa');
    });

    it('returns undefined for an unknown code', async () => {
      const row = await getOperatorByCode(handle.db, 'ZZ');
      expect(row).toBeUndefined();
    });

    it('roundtrips via getOperatorById', async () => {
      const lh = await getOperatorByCode(handle.db, 'LH');
      expect(lh).toBeDefined();
      const byId = await getOperatorById(handle.db, lh!.id);
      expect(byId?.code).toBe('LH');
    });
  });
});
