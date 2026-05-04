import { describe, expect, it } from 'vitest';

import type { Journey, Location, Operator } from '@/db/schema';

import {
  aggregateStats,
  aggregateStatsMemo,
  computeModePieData,
  EARTH_CIRCUMFERENCE_KM,
  EARTH_TO_MOON_KM,
  memoize,
  statsByMode,
  statsByMonth,
  statsByYear,
  topOperators,
  topRoutes,
} from '../index';

const baseJourney: Journey = {
  id: 'j-base',
  mode: 'flight',
  fromLocationId: 'loc-a',
  toLocationId: 'loc-b',
  date: '2026-04-15',
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
  distanceKm: 0,
  durationMinutes: 0,
  routeType: null,
  routePointsJson: null,
  notes: null,
  rating: null,
  weather: null,
  isManualEntry: true,
  source: 'manual',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const j = (o: Partial<Journey>): Journey => ({ ...baseJourney, ...o });

const loc = (id: string, country: string | null): Pick<Location, 'id' | 'country'> => ({
  id,
  country,
});

const op = (id: string, name: string): Pick<Operator, 'id' | 'name'> => ({ id, name });

const SAMPLE_JOURNEYS: Journey[] = [
  j({
    id: 'j1',
    mode: 'flight',
    fromLocationId: 'fra',
    toLocationId: 'jfk',
    operatorId: 'lh',
    vehicleId: 'b77w',
    distanceKm: 6204,
    durationMinutes: 540,
    date: '2026-01-10',
  }),
  j({
    id: 'j2',
    mode: 'flight',
    fromLocationId: 'jfk',
    toLocationId: 'fra',
    operatorId: 'lh',
    vehicleId: 'b77w',
    distanceKm: 6204,
    durationMinutes: 480,
    date: '2026-01-20',
  }),
  j({
    id: 'j3',
    mode: 'train',
    fromLocationId: 'fra',
    toLocationId: 'muc',
    operatorId: 'db',
    distanceKm: 305,
    durationMinutes: 195,
    date: '2026-03-05',
  }),
  j({
    id: 'j4',
    mode: 'car',
    fromLocationId: 'muc',
    toLocationId: 'fra',
    distanceKm: 400,
    durationMinutes: 240,
    date: '2026-04-12',
  }),
  j({
    id: 'j5',
    mode: 'flight',
    fromLocationId: 'fra',
    toLocationId: 'jfk',
    operatorId: 'lh',
    vehicleId: 'b77w',
    distanceKm: 6204,
    durationMinutes: 530,
    date: '2026-08-01',
  }),
];

const REFS = {
  locationsById: new Map([
    ['fra', loc('fra', 'DE')],
    ['jfk', loc('jfk', 'US')],
    ['muc', loc('muc', 'DE')],
  ]),
  operatorsById: new Map([
    ['lh', op('lh', 'Lufthansa')],
    ['db', op('db', 'Deutsche Bahn')],
  ]),
};

describe('aggregateStats', () => {
  it('totals distance + duration and counts modes', () => {
    const s = aggregateStats(SAMPLE_JOURNEYS, REFS);
    expect(s.totalKm).toBe(6204 + 6204 + 305 + 400 + 6204);
    expect(s.totalDurationMinutes).toBe(540 + 480 + 195 + 240 + 530);
    expect(s.flightCount).toBe(3);
    expect(s.trainCount).toBe(1);
    expect(s.carCount).toBe(1);
    expect(s.shipCount).toBe(0);
    expect(s.otherCount).toBe(0);
  });

  it('derives countriesVisited / unique counts / earth+moon progress', () => {
    const s = aggregateStats(SAMPLE_JOURNEYS, REFS);
    expect(s.countryCodes).toEqual(['DE', 'US']);
    expect(s.countriesVisited).toBe(2);
    expect(s.locationCount).toBe(3); // fra, jfk, muc
    expect(s.operatorCount).toBe(2);
    expect(s.vehicleCount).toBe(1);
    expect(s.earthRotations).toBeCloseTo(s.totalKm / EARTH_CIRCUMFERENCE_KM, 6);
    expect(s.moonProgress).toBeCloseTo(s.totalKm / EARTH_TO_MOON_KM, 6);
  });

  it('finds longest + shortest journey + most-frequent route + operator', () => {
    const s = aggregateStats(SAMPLE_JOURNEYS, REFS);
    expect(s.longestJourneyKm).toBe(6204);
    expect(['j1', 'j2', 'j5']).toContain(s.longestJourneyId);
    expect(s.shortestJourneyKm).toBe(305);
    expect(s.shortestJourneyId).toBe('j3');
    expect(s.mostFrequentRoute).toEqual({ from: 'fra', to: 'jfk', count: 2 });
    expect(s.mostFrequentOperator).toEqual({ id: 'lh', name: 'Lufthansa', count: 3 });
  });

  it('returns zero/null shape on empty input', () => {
    const s = aggregateStats([], REFS);
    expect(s.totalKm).toBe(0);
    expect(s.longestJourneyKm).toBe(0);
    expect(s.longestJourneyId).toBeNull();
    expect(s.mostFrequentRoute).toBeNull();
    expect(s.mostFrequentOperator).toBeNull();
  });

  it('omits country-related fields when refs are not provided', () => {
    const s = aggregateStats(SAMPLE_JOURNEYS);
    expect(s.countryCodes).toEqual([]);
    expect(s.countriesVisited).toBe(0);
    expect(s.mostFrequentOperator?.name).toBe('lh'); // falls back to id
  });
});

describe('statsByYear / statsByMode / statsByMonth', () => {
  it('statsByYear filters by year', () => {
    const s = statsByYear(SAMPLE_JOURNEYS, 2025, REFS);
    expect(s.totalKm).toBe(0);

    const s2 = statsByYear(SAMPLE_JOURNEYS, 2026, REFS);
    expect(s2.totalKm).toBeGreaterThan(0);
  });

  it('statsByMode filters to a single mode', () => {
    const trains = statsByMode(SAMPLE_JOURNEYS, 'train', REFS);
    expect(trains.flightCount).toBe(0);
    expect(trains.trainCount).toBe(1);
    expect(trains.totalKm).toBe(305);
  });

  it('statsByMonth produces 12 buckets keyed by month', () => {
    const months = statsByMonth(SAMPLE_JOURNEYS, 2026, REFS);
    expect(
      Object.keys(months)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(months[1]?.totalKm).toBe(6204 + 6204);
    expect(months[2]?.totalKm).toBe(0);
    expect(months[3]?.totalKm).toBe(305);
    expect(months[4]?.totalKm).toBe(400);
    expect(months[8]?.totalKm).toBe(6204);
  });
});

describe('topRoutes / topOperators', () => {
  it('topRoutes orders by count then totalKm', () => {
    const top = topRoutes(SAMPLE_JOURNEYS, 5);
    expect(top[0]).toEqual({ from: 'fra', to: 'jfk', count: 2, totalKm: 12408 });
    expect(top.map((r) => `${r.from}>${r.to}`)).toContain('jfk>fra');
  });

  it('topOperators uses ref names when available', () => {
    const top = topOperators(SAMPLE_JOURNEYS, 5, REFS);
    expect(top[0]).toEqual({ operator: 'Lufthansa', count: 3, totalKm: 18612 });
    expect(top[1]).toEqual({ operator: 'Deutsche Bahn', count: 1, totalKm: 305 });
  });
});

describe('memoize', () => {
  it('returns the cached result on identical references', () => {
    let calls = 0;
    const fn = memoize((arr: number[]) => {
      calls++;
      return arr.reduce((a, b) => a + b, 0);
    });
    const arr = [1, 2, 3];
    expect(fn(arr)).toBe(6);
    expect(fn(arr)).toBe(6);
    expect(calls).toBe(1);
  });

  it('recomputes when an argument reference changes', () => {
    let calls = 0;
    const fn = memoize((arr: number[]) => {
      calls++;
      return arr.length;
    });
    fn([1, 2]);
    fn([1, 2]);
    expect(calls).toBe(2);
  });

  it('aggregateStatsMemo is reference-stable for identical inputs', () => {
    const a = aggregateStatsMemo(SAMPLE_JOURNEYS, REFS);
    const b = aggregateStatsMemo(SAMPLE_JOURNEYS, REFS);
    expect(a).toBe(b);
  });
});

describe('computeModePieData', () => {
  it('returns null for empty input', () => {
    expect(computeModePieData([])).toBeNull();
  });

  it('returns a single slice for flight-only data', () => {
    const slices = computeModePieData([{ mode: 'flight' }, { mode: 'flight' }]);
    expect(slices).toEqual([{ key: 'flight', value: 2 }]);
  });

  it('returns two slices for Phase-1 mixed Flight + Other', () => {
    const slices = computeModePieData([
      { mode: 'flight' },
      { mode: 'flight' },
      { mode: 'other' },
    ]);
    expect(slices).toEqual([
      { key: 'flight', value: 2 },
      { key: 'other', value: 1 },
    ]);
  });

  it('keeps existing train data honest in the pie even when Train is hidden in the picker', () => {
    // Existing user data may contain train journeys recorded before
    // Phase-1 launch; the pie should reflect what's actually in the DB.
    const slices = computeModePieData([
      { mode: 'flight' },
      { mode: 'train' },
      { mode: 'other' },
    ]);
    expect(slices).toHaveLength(3);
    expect(slices?.map((s) => s.key)).toEqual(['flight', 'train', 'other']);
  });

  it('buckets walk/bike into the other slice', () => {
    const slices = computeModePieData([{ mode: 'walk' }, { mode: 'bike' }]);
    expect(slices).toEqual([{ key: 'other', value: 2 }]);
  });
});
