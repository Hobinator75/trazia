import { describe, expect, it } from 'vitest';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';

import { applyFilters, buildFacets, groupByYearMonth } from '../sections';

const j = (
  overrides: Partial<JourneyWithRefs> & { id: string; date: string },
): JourneyWithRefs => ({
  mode: 'flight',
  fromLocationId: 'fra',
  toLocationId: 'jfk',
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
  createdAt: new Date(overrides.date),
  updatedAt: new Date(overrides.date),
  fromLocation: null,
  toLocation: null,
  operator: null,
  vehicle: null,
  ...overrides,
});

const fra = {
  id: 'fra',
  name: 'Frankfurt',
  iata: 'FRA',
  city: 'Frankfurt',
  country: 'DE',
  lat: 0,
  lng: 0,
  type: 'airport' as const,
  icao: null,
  ibnr: null,
  unlocode: null,
  isSystemSeed: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const jfk = { ...fra, id: 'jfk', name: 'JFK', iata: 'JFK', city: 'New York', country: 'US' };
const muc = { ...fra, id: 'muc', name: 'Munich', iata: 'MUC', city: 'München', country: 'DE' };

const lh = {
  id: 'lh',
  name: 'Lufthansa',
  code: 'LH',
  modes: ['flight'] as ('flight' | 'train' | 'car' | 'ship')[],
  country: 'DE',
  logoPath: null,
  isSystemSeed: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const FRA_JFK_FLIGHT = j({
  id: '1',
  date: '2026-04-15',
  fromLocation: fra,
  toLocation: jfk,
  operator: lh,
  operatorId: lh.id,
  serviceNumber: 'LH 400',
});
const FRA_MUC_TRAIN = j({
  id: '2',
  date: '2025-08-10',
  mode: 'train',
  fromLocation: fra,
  toLocation: muc,
});
const MUC_FRA_TRAIN = j({
  id: '3',
  date: '2025-08-12',
  mode: 'train',
  fromLocation: muc,
  toLocation: fra,
});

const ALL = [FRA_JFK_FLIGHT, FRA_MUC_TRAIN, MUC_FRA_TRAIN];
const EMPTY_FILTERS = { modes: [], years: [], operatorIds: [], countries: [] };

describe('applyFilters', () => {
  it('returns all when no filters and empty search', () => {
    expect(applyFilters(ALL, EMPTY_FILTERS, '')).toHaveLength(3);
  });

  it('filters by mode', () => {
    expect(applyFilters(ALL, { ...EMPTY_FILTERS, modes: ['flight'] }, '')).toEqual([
      FRA_JFK_FLIGHT,
    ]);
    expect(applyFilters(ALL, { ...EMPTY_FILTERS, modes: ['train'] }, '')).toHaveLength(2);
  });

  it('filters by year', () => {
    const r2025 = applyFilters(ALL, { ...EMPTY_FILTERS, years: [2025] }, '');
    expect(r2025).toHaveLength(2);
    expect(r2025.every((x) => x.date.startsWith('2025'))).toBe(true);
  });

  it('filters by operatorId (only journeys with that op survive)', () => {
    const r = applyFilters(ALL, { ...EMPTY_FILTERS, operatorIds: ['lh'] }, '');
    expect(r).toEqual([FRA_JFK_FLIGHT]);
  });

  it('filters by country (matches either from or to)', () => {
    const us = applyFilters(ALL, { ...EMPTY_FILTERS, countries: ['US'] }, '');
    expect(us).toEqual([FRA_JFK_FLIGHT]);
    const de = applyFilters(ALL, { ...EMPTY_FILTERS, countries: ['DE'] }, '');
    expect(de).toHaveLength(3);
  });

  it('search matches IATA, name, city, operator, service-number, notes', () => {
    expect(applyFilters(ALL, EMPTY_FILTERS, 'jfk')).toEqual([FRA_JFK_FLIGHT]);
    expect(applyFilters(ALL, EMPTY_FILTERS, 'lufthansa')).toEqual([FRA_JFK_FLIGHT]);
    expect(applyFilters(ALL, EMPTY_FILTERS, 'lh 400')).toEqual([FRA_JFK_FLIGHT]);
    expect(applyFilters(ALL, EMPTY_FILTERS, 'munich')).toHaveLength(2);
  });

  it('combines filter + search (intersection)', () => {
    expect(
      applyFilters(ALL, { ...EMPTY_FILTERS, modes: ['flight'] }, 'munich'),
    ).toHaveLength(0);
    expect(
      applyFilters(ALL, { ...EMPTY_FILTERS, modes: ['train'] }, 'munich'),
    ).toHaveLength(2);
  });
});

describe('groupByYearMonth', () => {
  it('groups journeys into year-month sections, newest first', () => {
    const sections = groupByYearMonth(ALL);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.year).toBe(2026);
    expect(sections[0]?.month).toBe(4);
    expect(sections[0]?.data).toEqual([FRA_JFK_FLIGHT]);
    expect(sections[1]?.year).toBe(2025);
    expect(sections[1]?.month).toBe(8);
    expect(sections[1]?.data).toEqual([FRA_MUC_TRAIN, MUC_FRA_TRAIN]);
  });

  it('handles empty input', () => {
    expect(groupByYearMonth([])).toEqual([]);
  });
});

describe('buildFacets', () => {
  it('returns deduped, sorted facets covering all filterable fields', () => {
    const f = buildFacets(ALL);
    expect(f.modes.map((m) => m.id).sort()).toEqual(['flight', 'train']);
    expect(f.years).toEqual([2026, 2025]);
    expect(f.operators.map((o) => o.id)).toEqual(['lh']);
    expect(f.countries.map((c) => c.id).sort()).toEqual(['DE', 'US']);
  });
});
