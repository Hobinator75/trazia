import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import type { TransportMode } from '@/types/domain-types';

import type { JourneyFilters } from '@/components/domain/JourneyFilterSheet';

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

export interface JourneySection {
  title: string;
  year: number;
  month: number;
  data: JourneyWithRefs[];
}

const yearOf = (iso: string): number => Number.parseInt(iso.slice(0, 4), 10);
const monthOf = (iso: string): number => Number.parseInt(iso.slice(5, 7), 10);

export function applyFilters(
  rows: JourneyWithRefs[],
  filters: JourneyFilters,
  search: string,
): JourneyWithRefs[] {
  const q = search.trim().toLowerCase();
  return rows.filter((j) => {
    if (filters.modes.length > 0 && !filters.modes.includes(j.mode as TransportMode)) return false;
    if (filters.years.length > 0 && !filters.years.includes(yearOf(j.date))) return false;
    if (filters.operatorIds.length > 0) {
      if (!j.operatorId || !filters.operatorIds.includes(j.operatorId)) return false;
    }
    if (filters.countries.length > 0) {
      const fromCountry = j.fromLocation?.country ?? null;
      const toCountry = j.toLocation?.country ?? null;
      const hit =
        (fromCountry && filters.countries.includes(fromCountry)) ||
        (toCountry && filters.countries.includes(toCountry));
      if (!hit) return false;
    }
    if (q.length > 0) {
      const haystack = [
        j.fromLocation?.iata,
        j.fromLocation?.icao,
        j.fromLocation?.name,
        j.fromLocation?.city,
        j.toLocation?.iata,
        j.toLocation?.icao,
        j.toLocation?.name,
        j.toLocation?.city,
        j.operator?.name,
        j.operator?.code,
        j.serviceNumber,
        j.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function groupByYearMonth(rows: JourneyWithRefs[]): JourneySection[] {
  const map = new Map<string, JourneySection>();
  for (const j of rows) {
    const y = yearOf(j.date);
    const m = monthOf(j.date);
    const key = `${y}-${String(m).padStart(2, '0')}`;
    let section = map.get(key);
    if (!section) {
      section = {
        title: `${MONTH_NAMES[m - 1] ?? '—'} ${y}`,
        year: y,
        month: m,
        data: [],
      };
      map.set(key, section);
    }
    section.data.push(j);
  }
  // Already sorted by date desc upstream; re-sort sections to be safe.
  return [...map.values()].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

export interface FacetOptions {
  modes: { id: string; label: string }[];
  years: number[];
  operators: { id: string; label: string }[];
  countries: { id: string; label: string }[];
}

const MODE_LABELS: Record<string, string> = {
  flight: 'Flug',
  train: 'Zug',
  car: 'Auto',
  ship: 'Schiff',
};

export function buildFacets(rows: JourneyWithRefs[]): FacetOptions {
  const modes = new Set<string>();
  const years = new Set<number>();
  const operators = new Map<string, string>();
  const countries = new Set<string>();

  for (const j of rows) {
    modes.add(j.mode);
    years.add(yearOf(j.date));
    if (j.operator) operators.set(j.operator.id, j.operator.name);
    if (j.fromLocation?.country) countries.add(j.fromLocation.country);
    if (j.toLocation?.country) countries.add(j.toLocation.country);
  }

  return {
    modes: [...modes].map((m) => ({ id: m, label: MODE_LABELS[m] ?? m })),
    years: [...years].sort((a, b) => b - a),
    operators: [...operators.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    countries: [...countries].sort().map((c) => ({ id: c, label: c })),
  };
}
