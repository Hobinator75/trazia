import { and, eq, isNotNull } from 'drizzle-orm';

import aircraftJson from '../../../assets/static/aircraft.json';
import airlinesJson from '../../../assets/static/airlines.json';
import airportsJson from '../../../assets/static/airports.json';
import railwayOperatorsJson from '../../../assets/static/railway_operators.json';
import trainStationsJson from '../../../assets/static/train_stations.json';
import trainsJson from '../../../assets/static/trains.json';
import { locations, operators, vehicles } from '../schema';
import type { DrizzleDb } from '../types';
import { SEED_VERSION, SEED_VERSION_KEY } from './constants';
import type { SeedStorage } from './loadFromSeedDb';

// @deprecated Slow path retained as fallback for the Vitest environment
// (which can't load expo-asset) and for any device where the pre-built
// seed-DB asset is missing. Production cold-starts go through
// `loadFromSeedDb` which is 5–15× faster.
export { SEED_VERSION, SEED_VERSION_KEY };

// SQLite caps each prepared statement at 999 parameters. Each location row
// has 11 columns inserted, so 250 rows × 11 = 2750 — too many. Pick a chunk
// size that stays under 999 for the widest table (locations).
const INSERT_CHUNK = 80;

export interface AirportRecord {
  iata: string | null;
  icao: string | null;
  name: string;
  city?: string | null;
  country: string;
  lat: number;
  lng: number;
}

export interface AirlineRecord {
  iata: string | null;
  icao: string | null;
  name: string;
  country?: string | null;
}

export interface AircraftRecord {
  code: string;
  manufacturer: string;
  model: string;
  category?: string | null;
  capacity?: number | null;
}

export interface TrainStationRecord {
  ibnr: string;
  name: string;
  city?: string | null;
  country: string;
  lat: number;
  lng: number;
  station_class?: string | null;
}

export interface RailwayOperatorRecord {
  code: string;
  name: string;
  country?: string | null;
  modes?: ('train' | 'flight' | 'car' | 'ship')[];
}

export interface TrainRecord {
  code: string;
  manufacturer: string;
  model: string;
  category?: string | null;
  country?: string | null;
  name_short?: string | null;
}

export interface SeedDataset {
  airports: AirportRecord[];
  airlines: AirlineRecord[];
  aircraft: AircraftRecord[];
  trainStations: TrainStationRecord[];
  railwayOperators: RailwayOperatorRecord[];
  trains: TrainRecord[];
}

export type { SeedStorage };

export interface SeedFromStaticOptions {
  db: DrizzleDb;
  storage: SeedStorage;
  data?: SeedDataset;
}

export interface SeedResult {
  inserted: boolean;
  reason: 'fresh-install' | 'self-heal' | 'version-upgrade' | 'up-to-date';
  counts: { locations: number; operators: number; vehicles: number };
}

const defaultDataset: SeedDataset = {
  airports: airportsJson as AirportRecord[],
  airlines: airlinesJson as AirlineRecord[],
  aircraft: aircraftJson as AircraftRecord[],
  trainStations: trainStationsJson as TrainStationRecord[],
  railwayOperators: railwayOperatorsJson as RailwayOperatorRecord[],
  trains: trainsJson as TrainRecord[],
};

const ZERO_COUNTS = { locations: 0, operators: 0, vehicles: 0 } as const;

export async function seedFromStatic(opts: SeedFromStaticOptions): Promise<SeedResult> {
  const data = opts.data ?? defaultDataset;
  const currentVersion = await opts.storage.getItem(SEED_VERSION_KEY);

  const probe = await opts.db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.isSystemSeed, true))
    .limit(1);
  const hasData = probe.length > 0;

  if (currentVersion === SEED_VERSION && hasData) {
    return { inserted: false, reason: 'up-to-date', counts: ZERO_COUNTS };
  }

  const counts = await upsertAdditive(opts.db, data);
  await opts.storage.setItem(SEED_VERSION_KEY, SEED_VERSION);

  let reason: SeedResult['reason'];
  if (currentVersion === null) reason = 'fresh-install';
  else if (!hasData) reason = 'self-heal';
  else reason = 'version-upgrade';

  return { inserted: true, reason, counts };
}

// Insert only catalog entries whose stable identifier (IATA for airports,
// `code` for operators / vehicles) isn't already present as a system seed.
// This keeps upgrades cheap (just inserts the diff), preserves FK references
// to existing rows, and never touches user-created rows.
async function upsertAdditive(
  db: DrizzleDb,
  data: SeedDataset,
): Promise<{ locations: number; operators: number; vehicles: number }> {
  const newAirports = await upsertAirports(db, data.airports);
  const newStations = await upsertTrainStations(db, data.trainStations);
  const newAirlines = await upsertOperators(db, data.airlines);
  const newRailwayOps = await upsertRailwayOperators(db, data.railwayOperators);
  const newAircraft = await upsertVehicles(db, data.aircraft);
  const newTrains = await upsertTrains(db, data.trains);
  return {
    locations: newAirports + newStations,
    operators: newAirlines + newRailwayOps,
    vehicles: newAircraft + newTrains,
  };
}

async function upsertAirports(db: DrizzleDb, airports: AirportRecord[]): Promise<number> {
  if (airports.length === 0) return 0;

  const existingRows = await db
    .select({ iata: locations.iata })
    .from(locations)
    .where(and(eq(locations.isSystemSeed, true), isNotNull(locations.iata)));
  const existing = new Set(existingRows.map((r) => r.iata).filter((i): i is string => Boolean(i)));

  const newRows = airports
    .filter((a) => a.iata && !existing.has(a.iata))
    .map((a) => ({
      name: a.name,
      city: a.city ?? null,
      country: a.country,
      lat: a.lat,
      lng: a.lng,
      type: 'airport' as const,
      iata: a.iata,
      icao: a.icao,
      isSystemSeed: true,
    }));

  for (let i = 0; i < newRows.length; i += INSERT_CHUNK) {
    const chunk = newRows.slice(i, i + INSERT_CHUNK);
    if (chunk.length > 0) await db.insert(locations).values(chunk);
  }
  return newRows.length;
}

async function upsertOperators(db: DrizzleDb, airlines: AirlineRecord[]): Promise<number> {
  if (airlines.length === 0) return 0;

  const existingRows = await db
    .select({ code: operators.code })
    .from(operators)
    .where(and(eq(operators.isSystemSeed, true), isNotNull(operators.code)));
  const existing = new Set(existingRows.map((r) => r.code).filter((c): c is string => Boolean(c)));

  const newRows = airlines
    .map((a) => ({
      name: a.name,
      code: a.iata ?? a.icao,
      modes: ['flight' as const],
      country: a.country ?? null,
      isSystemSeed: true,
    }))
    .filter(
      (row): row is typeof row & { code: string } =>
        Boolean(row.code) && !existing.has(row.code as string),
    );

  for (let i = 0; i < newRows.length; i += INSERT_CHUNK) {
    const chunk = newRows.slice(i, i + INSERT_CHUNK);
    if (chunk.length > 0) await db.insert(operators).values(chunk);
  }
  return newRows.length;
}

async function upsertVehicles(db: DrizzleDb, aircraft: AircraftRecord[]): Promise<number> {
  if (aircraft.length === 0) return 0;

  const existingRows = await db
    .select({ code: vehicles.code, mode: vehicles.mode })
    .from(vehicles)
    .where(and(eq(vehicles.isSystemSeed, true), isNotNull(vehicles.code)));
  const existing = new Set(
    existingRows
      .filter((r) => r.mode === 'flight')
      .map((r) => r.code)
      .filter((c): c is string => Boolean(c)),
  );

  const newRows = aircraft
    .filter((v) => !existing.has(v.code))
    .map((v) => ({
      mode: 'flight' as const,
      code: v.code,
      category: v.category ?? null,
      manufacturer: v.manufacturer,
      model: v.model,
      capacity: v.capacity ?? null,
      isSystemSeed: true,
    }));

  for (let i = 0; i < newRows.length; i += INSERT_CHUNK) {
    const chunk = newRows.slice(i, i + INSERT_CHUNK);
    if (chunk.length > 0) await db.insert(vehicles).values(chunk);
  }
  return newRows.length;
}

async function upsertTrainStations(db: DrizzleDb, stations: TrainStationRecord[]): Promise<number> {
  if (stations.length === 0) return 0;

  const existingRows = await db
    .select({ ibnr: locations.ibnr })
    .from(locations)
    .where(and(eq(locations.isSystemSeed, true), isNotNull(locations.ibnr)));
  const existing = new Set(existingRows.map((r) => r.ibnr).filter((i): i is string => Boolean(i)));

  const newRows = stations
    .filter((s) => !existing.has(s.ibnr))
    .map((s) => ({
      name: s.name,
      city: s.city ?? null,
      country: s.country,
      lat: s.lat,
      lng: s.lng,
      type: 'train_station' as const,
      ibnr: s.ibnr,
      isSystemSeed: true,
    }));

  for (let i = 0; i < newRows.length; i += INSERT_CHUNK) {
    const chunk = newRows.slice(i, i + INSERT_CHUNK);
    if (chunk.length > 0) await db.insert(locations).values(chunk);
  }
  return newRows.length;
}

async function upsertRailwayOperators(
  db: DrizzleDb,
  ops: RailwayOperatorRecord[],
): Promise<number> {
  if (ops.length === 0) return 0;

  const existingRows = await db
    .select({ code: operators.code, modes: operators.modes })
    .from(operators)
    .where(and(eq(operators.isSystemSeed, true), isNotNull(operators.code)));

  // Track which (code, mode) pairs are already seeded so an airline with
  // code "DB" (Deutsche Bahn) doesn't collide with any code-clash future
  // airline.
  const trainCodesSeeded = new Set(
    existingRows
      .filter((r) => Array.isArray(r.modes) && r.modes.includes('train'))
      .map((r) => r.code)
      .filter((c): c is string => Boolean(c)),
  );

  const newRows = ops
    .filter((o) => !trainCodesSeeded.has(o.code))
    .map((o) => ({
      name: o.name,
      code: o.code,
      modes: o.modes ?? (['train'] as ('train' | 'flight' | 'car' | 'ship')[]),
      country: o.country ?? null,
      isSystemSeed: true,
    }));

  for (let i = 0; i < newRows.length; i += INSERT_CHUNK) {
    const chunk = newRows.slice(i, i + INSERT_CHUNK);
    if (chunk.length > 0) await db.insert(operators).values(chunk);
  }
  return newRows.length;
}

async function upsertTrains(db: DrizzleDb, trains: TrainRecord[]): Promise<number> {
  if (trains.length === 0) return 0;

  const existingRows = await db
    .select({ code: vehicles.code, mode: vehicles.mode })
    .from(vehicles)
    .where(and(eq(vehicles.isSystemSeed, true), isNotNull(vehicles.code)));
  const existing = new Set(
    existingRows
      .filter((r) => r.mode === 'train')
      .map((r) => r.code)
      .filter((c): c is string => Boolean(c)),
  );

  const newRows = trains
    .filter((t) => !existing.has(t.code))
    .map((t) => ({
      mode: 'train' as const,
      code: t.code,
      category: t.category ?? null,
      manufacturer: t.manufacturer,
      model: t.model,
      capacity: null,
      isSystemSeed: true,
    }));

  for (let i = 0; i < newRows.length; i += INSERT_CHUNK) {
    const chunk = newRows.slice(i, i + INSERT_CHUNK);
    if (chunk.length > 0) await db.insert(vehicles).values(chunk);
  }
  return newRows.length;
}
