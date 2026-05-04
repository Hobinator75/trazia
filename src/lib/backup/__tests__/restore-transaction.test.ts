import { sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/__tests__/test-db';
import { SNAPSHOT_VERSION, type DbSnapshot } from '@/lib/export/snapshot';

import { restoreFromSnapshot, validateSnapshot } from '../restore';

const minimalSnapshot = (overrides: Partial<DbSnapshot> = {}): DbSnapshot => ({
  version: SNAPSHOT_VERSION,
  exportedAt: '2026-05-01T00:00:00Z',
  locations: [],
  operators: [],
  vehicles: [],
  journeys: [],
  journeyCompanions: [],
  journeyTags: [],
  journeyPhotos: [],
  trips: [],
  tripJourneys: [],
  achievementUnlocks: [],
  ...overrides,
});

const journeyRow = (over: Record<string, unknown> = {}) => ({
  id: 'j-1',
  mode: 'flight' as const,
  fromLocationId: 'loc-1',
  toLocationId: 'loc-1',
  date: '2026-04-01',
  startTimeLocal: null,
  endTimeLocal: null,
  startTimezone: null,
  endTimezone: null,
  operatorId: null,
  vehicleId: null,
  serviceNumber: null,
  cabinClass: null,
  seatNumber: null,
  parentJourneyId: null,
  distanceKm: null,
  durationMinutes: null,
  routeType: null,
  routePointsJson: null,
  notes: null,
  rating: null,
  weather: null,
  isManualEntry: true,
  source: 'manual',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('validateSnapshot', () => {
  it('rejects a snapshot with the wrong version', () => {
    const result = validateSnapshot({ ...minimalSnapshot(), version: 999 });
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/Unsupported snapshot version/);
  });

  it('rejects a snapshot with broken foreign keys', () => {
    const snapshot = minimalSnapshot({
      journeys: [journeyRow({ fromLocationId: 'missing', toLocationId: 'missing' })],
    });
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('missing fromLocation'))).toBe(true);
  });

  it('rejects duplicate primary keys', () => {
    const snapshot = minimalSnapshot({
      locations: [
        {
          id: 'dup',
          name: 'a',
          lat: 0,
          lng: 0,
          type: 'airport',
          city: null,
          country: null,
          iata: null,
          icao: null,
          ibnr: null,
          unlocode: null,
          isSystemSeed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'dup',
          name: 'b',
          lat: 0,
          lng: 0,
          type: 'airport',
          city: null,
          country: null,
          iata: null,
          icao: null,
          ibnr: null,
          unlocode: null,
          isSystemSeed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /Duplicate location/.test(e))).toBe(true);
  });

  it('accepts a clean snapshot', () => {
    const result = validateSnapshot(minimalSnapshot());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('restoreFromSnapshot', () => {
  let handle: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    handle = createTestDb();
    handle.sqlite
      .prepare(
        'INSERT INTO locations (id, name, lat, lng, type, is_system_seed) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('loc-keep', 'Keep', 50, 8, 'airport', 0);
    handle.sqlite
      .prepare(
        'INSERT INTO journeys (id, mode, from_location_id, to_location_id, date) VALUES (?, ?, ?, ?, ?)',
      )
      .run('j-keep', 'flight', 'loc-keep', 'loc-keep', '2026-04-01');
  });

  afterEach(() => {
    handle.close();
  });

  it('replaces data with a valid snapshot', async () => {
    const snapshot = minimalSnapshot({
      locations: [
        {
          id: 'loc-new',
          name: 'New',
          lat: 1,
          lng: 1,
          type: 'airport',
          city: null,
          country: null,
          iata: null,
          icao: null,
          ibnr: null,
          unlocode: null,
          isSystemSeed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      journeys: [journeyRow({ id: 'j-new', fromLocationId: 'loc-new', toLocationId: 'loc-new' })],
    });
    const result = await restoreFromSnapshot(handle.db, snapshot);
    expect(result.ok).toBe(true);

    const rows = (await handle.db.all(sql.raw('SELECT id FROM journeys'))) as { id: string }[];
    expect(rows.map((r) => r.id)).toEqual(['j-new']);
  });

  it('with an invalid snapshot leaves DB unchanged (validation fails before delete)', async () => {
    const snapshot = minimalSnapshot({
      journeys: [journeyRow({ fromLocationId: 'does-not-exist' })],
    });
    const result = await restoreFromSnapshot(handle.db, snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid-snapshot');
    }
    const rows = (await handle.db.all(
      sql.raw("SELECT COUNT(*) as n FROM journeys WHERE id = 'j-keep'"),
    )) as { n: number }[];
    expect(rows[0]?.n).toBe(1);
  });

  it('rolls back on a mid-restore SQLite error and preserves existing data', async () => {
    // A UNIQUE constraint violation that validateSnapshot doesn't see —
    // two unlocks with the same achievementId. Validation accepts the
    // snapshot; the second INSERT throws once the destructive phase
    // is already underway. The transaction must roll back.
    const snapshot = minimalSnapshot({
      locations: [
        {
          id: 'loc-x',
          name: 'X',
          lat: 0,
          lng: 0,
          type: 'airport',
          city: null,
          country: null,
          iata: null,
          icao: null,
          ibnr: null,
          unlocode: null,
          isSystemSeed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      journeys: [
        journeyRow({
          id: 'j-1',
          fromLocationId: 'loc-x',
          toLocationId: 'loc-x',
        }),
      ],
      achievementUnlocks: [
        {
          id: 'au-1',
          achievementId: 'first_flight',
          unlockedAt: new Date(),
          triggeringJourneyId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'au-2',
          achievementId: 'first_flight',
          unlockedAt: new Date(),
          triggeringJourneyId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const result = await restoreFromSnapshot(handle.db, snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('transaction-failed');
    }

    const rows = (await handle.db.all(
      sql.raw("SELECT COUNT(*) as n FROM journeys WHERE id = 'j-keep'"),
    )) as { n: number }[];
    expect(rows[0]?.n).toBe(1);

    const locRows = (await handle.db.all(
      sql.raw("SELECT COUNT(*) as n FROM locations WHERE id = 'loc-keep'"),
    )) as { n: number }[];
    expect(locRows[0]?.n).toBe(1);
  });
});
