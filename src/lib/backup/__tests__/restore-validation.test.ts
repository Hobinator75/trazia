// validateSnapshot must reject every shape that would otherwise blow
// up halfway through the restore transaction. Codex Final Review noted
// that journeys.parentJourneyId, achievementUnlocks.triggeringJourneyId
// and per-table NOT NULL columns were unchecked — we rely on those
// invariants below so a malformed snapshot is rejected BEFORE the
// destructive delete phase, not during it.

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

const locationRow = (over: Record<string, unknown> = {}) => ({
  id: 'loc-1',
  name: 'Loc',
  lat: 0,
  lng: 0,
  type: 'airport' as const,
  city: null,
  country: null,
  iata: null,
  icao: null,
  ibnr: null,
  unlocode: null,
  isSystemSeed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
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

const unlockRow = (over: Record<string, unknown> = {}) => ({
  id: 'au-1',
  achievementId: 'first_flight',
  unlockedAt: new Date(),
  triggeringJourneyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('validateSnapshot — required NOT NULL columns', () => {
  it('rejects a journey row missing date', () => {
    // typed-in production code, but a corrupted JSON file could land here
    const snapshot = minimalSnapshot({
      locations: [locationRow()],
      journeys: [journeyRow({ date: null as unknown as string })],
    });
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /journeys row 0 missing required field 'date'/.test(e))).toBe(
      true,
    );
  });

  it('rejects a location row missing lat', () => {
    const snapshot = minimalSnapshot({
      locations: [locationRow({ lat: null as unknown as number })],
    });
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /locations row 0 missing required field 'lat'/.test(e))).toBe(
      true,
    );
  });

  it('rejects an achievement_unlock missing achievementId', () => {
    const snapshot = minimalSnapshot({
      achievementUnlocks: [unlockRow({ achievementId: null as unknown as string })],
    });
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((e) =>
        /achievementUnlocks row 0 missing required field 'achievementId'/.test(e),
      ),
    ).toBe(true);
  });
});

describe('validateSnapshot — parentJourneyId self-reference + FK', () => {
  it('rejects a snapshot with a dangling parentJourneyId', () => {
    const snapshot = minimalSnapshot({
      locations: [locationRow()],
      journeys: [journeyRow({ parentJourneyId: 'j-missing' })],
    });
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /references missing parentJourney j-missing/.test(e))).toBe(
      true,
    );
  });

  it('rejects a journey whose parentJourneyId is its own id', () => {
    const snapshot = minimalSnapshot({
      locations: [locationRow()],
      journeys: [journeyRow({ id: 'j-self', parentJourneyId: 'j-self' })],
    });
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /j-self parentJourneyId points at itself/.test(e))).toBe(true);
  });

  it('accepts a parent/child pair when both journeys are in the snapshot', () => {
    const snapshot = minimalSnapshot({
      locations: [locationRow()],
      journeys: [
        journeyRow({ id: 'j-parent' }),
        journeyRow({ id: 'j-child', parentJourneyId: 'j-parent' }),
      ],
    });
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('validateSnapshot — achievementUnlocks.triggeringJourneyId FK', () => {
  it('rejects an unlock pointing at a missing journey', () => {
    const snapshot = minimalSnapshot({
      achievementUnlocks: [unlockRow({ triggeringJourneyId: 'j-missing' })],
    });
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((e) => /references missing triggeringJourney j-missing/.test(e)),
    ).toBe(true);
  });

  it('accepts an unlock with null triggeringJourneyId (imported / seeded)', () => {
    const snapshot = minimalSnapshot({
      achievementUnlocks: [unlockRow({ triggeringJourneyId: null })],
    });
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(true);
  });

  it('accepts an unlock when the triggering journey is in the snapshot', () => {
    const snapshot = minimalSnapshot({
      locations: [locationRow()],
      journeys: [journeyRow({ id: 'j-trigger' })],
      achievementUnlocks: [unlockRow({ triggeringJourneyId: 'j-trigger' })],
    });
    const result = validateSnapshot(snapshot);
    expect(result.ok).toBe(true);
  });
});

describe('restoreFromSnapshot — pre-validation guards the destructive phase', () => {
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

  const expectExistingDataPreserved = async () => {
    const journeyRows = (await handle.db.all(
      sql.raw("SELECT COUNT(*) as n FROM journeys WHERE id = 'j-keep'"),
    )) as { n: number }[];
    expect(journeyRows[0]?.n).toBe(1);
    const locationRows = (await handle.db.all(
      sql.raw("SELECT COUNT(*) as n FROM locations WHERE id = 'loc-keep'"),
    )) as { n: number }[];
    expect(locationRows[0]?.n).toBe(1);
  };

  it('rejects missing-field snapshots BEFORE the destructive phase', async () => {
    const snapshot = minimalSnapshot({
      locations: [locationRow()],
      journeys: [journeyRow({ date: null as unknown as string })],
    });
    const result = await restoreFromSnapshot(handle.db, snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid-snapshot');
    }
    await expectExistingDataPreserved();
  });

  it('rejects dangling parentJourneyId BEFORE the destructive phase', async () => {
    const snapshot = minimalSnapshot({
      locations: [locationRow()],
      journeys: [journeyRow({ parentJourneyId: 'j-missing' })],
    });
    const result = await restoreFromSnapshot(handle.db, snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid-snapshot');
    }
    await expectExistingDataPreserved();
  });

  it('rejects dangling triggeringJourneyId BEFORE the destructive phase', async () => {
    const snapshot = minimalSnapshot({
      achievementUnlocks: [unlockRow({ triggeringJourneyId: 'j-missing' })],
    });
    const result = await restoreFromSnapshot(handle.db, snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid-snapshot');
    }
    await expectExistingDataPreserved();
  });
});
