import { and, eq, isNotNull } from 'drizzle-orm';

import aircraftJson from '../../../assets/static/aircraft.json';
import airlinesJson from '../../../assets/static/airlines.json';
import airportsJson from '../../../assets/static/airports.json';
import { locations, operators, vehicles } from '../schema';
import type { DrizzleDb } from '../types';

// Bumped from "1" to "2" when the static catalogs grew from a hand-curated
// 8-airport sample to the full OurAirports + OpenFlights datasets. See
// scripts/build-static-data.ts.
//
// Upgrade strategy: additive. Existing isSystemSeed=true rows are kept (so
// any user journey FK references stay valid); only catalog entries that
// aren't already present get inserted. User rows (isSystemSeed=false) are
// always left untouched.
export const SEED_VERSION = '2';
export const SEED_VERSION_KEY = 'seed.version';

// SQLite caps each prepared statement at 999 parameters. Each location row
// has 11 columns inserted, so 250 rows × 11 = 2750 — too many. Pick a chunk
// size that stays under 999 for the widest table (locations).
const INSERT_CHUNK = 80;

export interface SeedStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?: (key: string) => Promise<void>;
}

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

export interface SeedDataset {
  airports: AirportRecord[];
  airlines: AirlineRecord[];
  aircraft: AircraftRecord[];
}

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
  const insertedLocations = await upsertAirports(db, data.airports);
  const insertedOperators = await upsertOperators(db, data.airlines);
  const insertedVehicles = await upsertVehicles(db, data.aircraft);
  return {
    locations: insertedLocations,
    operators: insertedOperators,
    vehicles: insertedVehicles,
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
    .filter((row): row is typeof row & { code: string } =>
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
    .select({ code: vehicles.code })
    .from(vehicles)
    .where(and(eq(vehicles.isSystemSeed, true), isNotNull(vehicles.code)));
  const existing = new Set(existingRows.map((r) => r.code).filter((c): c is string => Boolean(c)));

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
