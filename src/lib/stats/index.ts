import type { Journey, Location, Operator } from '@/db/schema';
import type { TransportMode } from '@/types/domain-types';

export const EARTH_CIRCUMFERENCE_KM = 40075;
export const EARTH_TO_MOON_KM = 384400;

export interface StatsRefs {
  locationsById?: Map<string, Pick<Location, 'id' | 'country'>>;
  operatorsById?: Map<string, Pick<Operator, 'id' | 'name'>>;
}

export interface RouteAggregate {
  from: string;
  to: string;
  count: number;
}

export interface OperatorAggregate {
  id: string;
  name: string;
  count: number;
}

export interface Stats {
  totalKm: number;
  totalDurationMinutes: number;
  flightCount: number;
  trainCount: number;
  carCount: number;
  shipCount: number;
  otherCount: number;
  countriesVisited: number;
  countryCodes: string[];
  operatorCount: number;
  locationCount: number;
  vehicleCount: number;
  earthRotations: number;
  moonProgress: number;
  longestJourneyKm: number;
  longestJourneyId: string | null;
  shortestJourneyKm: number;
  shortestJourneyId: string | null;
  mostFrequentRoute: RouteAggregate | null;
  mostFrequentOperator: OperatorAggregate | null;
}

export function aggregateStats(journeys: Journey[], refs: StatsRefs = {}): Stats {
  let totalKm = 0;
  let totalDurationMinutes = 0;
  let flightCount = 0;
  let trainCount = 0;
  let carCount = 0;
  let shipCount = 0;
  let otherCount = 0;

  const countries = new Set<string>();
  const operators = new Set<string>();
  const locationIds = new Set<string>();
  const vehicleIds = new Set<string>();

  let longestJourneyKm = -Infinity;
  let longestJourneyId: string | null = null;
  let shortestJourneyKm = Infinity;
  let shortestJourneyId: string | null = null;

  const routeCounts = new Map<string, RouteAggregate>();
  const operatorCounts = new Map<string, { id: string; count: number }>();

  for (const journey of journeys) {
    const dist = journey.distanceKm ?? 0;
    totalKm += dist;
    totalDurationMinutes += journey.durationMinutes ?? 0;

    switch (journey.mode) {
      case 'flight':
        flightCount++;
        break;
      case 'train':
        trainCount++;
        break;
      case 'car':
        carCount++;
        break;
      case 'ship':
        shipCount++;
        break;
      default:
        otherCount++;
    }

    locationIds.add(journey.fromLocationId);
    locationIds.add(journey.toLocationId);
    if (journey.operatorId) operators.add(journey.operatorId);
    if (journey.vehicleId) vehicleIds.add(journey.vehicleId);

    if (refs.locationsById) {
      const from = refs.locationsById.get(journey.fromLocationId);
      const to = refs.locationsById.get(journey.toLocationId);
      if (from?.country) countries.add(from.country);
      if (to?.country) countries.add(to.country);
    }

    if (dist > longestJourneyKm) {
      longestJourneyKm = dist;
      longestJourneyId = journey.id;
    }
    if (dist > 0 && dist < shortestJourneyKm) {
      shortestJourneyKm = dist;
      shortestJourneyId = journey.id;
    }

    const routeKey = `${journey.fromLocationId}>${journey.toLocationId}`;
    const route = routeCounts.get(routeKey) ?? {
      from: journey.fromLocationId,
      to: journey.toLocationId,
      count: 0,
    };
    route.count++;
    routeCounts.set(routeKey, route);

    if (journey.operatorId) {
      const entry = operatorCounts.get(journey.operatorId) ?? {
        id: journey.operatorId,
        count: 0,
      };
      entry.count++;
      operatorCounts.set(journey.operatorId, entry);
    }
  }

  let mostFrequentRoute: RouteAggregate | null = null;
  for (const route of routeCounts.values()) {
    if (!mostFrequentRoute || route.count > mostFrequentRoute.count) {
      mostFrequentRoute = route;
    }
  }

  let mostFrequentOperator: OperatorAggregate | null = null;
  for (const op of operatorCounts.values()) {
    if (!mostFrequentOperator || op.count > mostFrequentOperator.count) {
      const name = refs.operatorsById?.get(op.id)?.name ?? op.id;
      mostFrequentOperator = { id: op.id, name, count: op.count };
    }
  }

  return {
    totalKm,
    totalDurationMinutes,
    flightCount,
    trainCount,
    carCount,
    shipCount,
    otherCount,
    countriesVisited: countries.size,
    countryCodes: [...countries].sort(),
    operatorCount: operators.size,
    locationCount: locationIds.size,
    vehicleCount: vehicleIds.size,
    earthRotations: totalKm / EARTH_CIRCUMFERENCE_KM,
    moonProgress: totalKm / EARTH_TO_MOON_KM,
    longestJourneyKm: longestJourneyKm === -Infinity ? 0 : longestJourneyKm,
    longestJourneyId,
    shortestJourneyKm: shortestJourneyKm === Infinity ? 0 : shortestJourneyKm,
    shortestJourneyId,
    mostFrequentRoute,
    mostFrequentOperator,
  };
}

const yearOf = (iso: string): number => Number.parseInt(iso.slice(0, 4), 10);
const monthOf = (iso: string): number => Number.parseInt(iso.slice(5, 7), 10);

export function statsByYear(journeys: Journey[], year: number, refs?: StatsRefs): Stats {
  return aggregateStats(
    journeys.filter((j) => yearOf(j.date) === year),
    refs,
  );
}

export function statsByMode(journeys: Journey[], mode: TransportMode, refs?: StatsRefs): Stats {
  return aggregateStats(
    journeys.filter((j) => j.mode === mode),
    refs,
  );
}

export function statsByMonth(
  journeys: Journey[],
  year: number,
  refs?: StatsRefs,
): Record<number, Stats> {
  const buckets: Record<number, Journey[]> = {};
  for (let m = 1; m <= 12; m++) buckets[m] = [];
  for (const j of journeys) {
    if (yearOf(j.date) !== year) continue;
    const m = monthOf(j.date);
    if (m >= 1 && m <= 12) buckets[m]!.push(j);
  }
  const out: Record<number, Stats> = {};
  for (let m = 1; m <= 12; m++) out[m] = aggregateStats(buckets[m]!, refs);
  return out;
}

export interface TopRouteEntry {
  from: string;
  to: string;
  count: number;
  totalKm: number;
}

export function topRoutes(journeys: Journey[], limit = 5): TopRouteEntry[] {
  const map = new Map<string, TopRouteEntry>();
  for (const j of journeys) {
    const key = `${j.fromLocationId}>${j.toLocationId}`;
    const entry = map.get(key) ?? {
      from: j.fromLocationId,
      to: j.toLocationId,
      count: 0,
      totalKm: 0,
    };
    entry.count++;
    entry.totalKm += j.distanceKm ?? 0;
    map.set(key, entry);
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || b.totalKm - a.totalKm)
    .slice(0, limit);
}

export interface TopOperatorEntry {
  operator: string;
  count: number;
  totalKm: number;
}

export function topOperators(journeys: Journey[], limit = 5, refs?: StatsRefs): TopOperatorEntry[] {
  const map = new Map<string, TopOperatorEntry & { id: string }>();
  for (const j of journeys) {
    if (!j.operatorId) continue;
    const name = refs?.operatorsById?.get(j.operatorId)?.name ?? j.operatorId;
    const entry = map.get(j.operatorId) ?? {
      id: j.operatorId,
      operator: name,
      count: 0,
      totalKm: 0,
    };
    entry.count++;
    entry.totalKm += j.distanceKm ?? 0;
    map.set(j.operatorId, entry);
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || b.totalKm - a.totalKm)
    .slice(0, limit)
    .map(({ id: _id, ...rest }) => rest);
}

// Reference-equality memoization. The caller is expected to keep argument
// references stable across renders (typical with Zustand selectors and
// useMemo upstream); when refs change, we simply recompute.
export function memoize<Args extends unknown[], R>(fn: (...args: Args) => R): (...args: Args) => R {
  let cachedArgs: Args | undefined;
  let cachedResult: R;
  return (...args: Args): R => {
    if (cachedArgs && cachedArgs.length === args.length) {
      let same = true;
      for (let i = 0; i < args.length; i++) {
        if (cachedArgs[i] !== args[i]) {
          same = false;
          break;
        }
      }
      if (same) return cachedResult;
    }
    cachedArgs = args;
    cachedResult = fn(...args);
    return cachedResult;
  };
}

export const aggregateStatsMemo = memoize(aggregateStats);

export type ModePieKey = 'flight' | 'train' | 'car' | 'ship' | 'other';

export interface ModePieSlice {
  key: ModePieKey;
  value: number;
}

// Pure helper for the Stats Modi-Verteilung pie. Pulled out of
// ChartsSection so the bucket logic is testable without React Native.
// Returns null when there are no journeys (caller renders empty state).
export function computeModePieData(
  journeys: Pick<Journey, 'mode'>[],
): ModePieSlice[] | null {
  const counts: Record<ModePieKey, number> = {
    flight: 0,
    train: 0,
    car: 0,
    ship: 0,
    other: 0,
  };
  for (const j of journeys) {
    const key: ModePieKey =
      j.mode === 'flight' || j.mode === 'train' || j.mode === 'car' || j.mode === 'ship'
        ? j.mode
        : 'other';
    counts[key] += 1;
  }
  const total = counts.flight + counts.train + counts.car + counts.ship + counts.other;
  if (total === 0) return null;
  const order: ModePieKey[] = ['flight', 'train', 'car', 'ship', 'other'];
  return order
    .map((key) => ({ key, value: counts[key] }))
    .filter((slice) => slice.value > 0);
}
