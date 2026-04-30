import { eq } from 'drizzle-orm';

import aircraftJson from '../../../assets/static/aircraft.json';
import airlinesJson from '../../../assets/static/airlines.json';
import airportsJson from '../../../assets/static/airports.json';
import { locations, operators, vehicles } from '../schema';
import type { DrizzleDb } from '../types';

export const SEED_VERSION = '1';
export const SEED_VERSION_KEY = 'seed.version';

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
  reason: 'fresh-install' | 'self-heal' | 'up-to-date';
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

  // Self-heal: if the version key claims we're seeded but the table is empty
  // (e.g. after resetDatabase()) we need to re-seed regardless.
  const probe = await opts.db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.isSystemSeed, true))
    .limit(1);
  const hasData = probe.length > 0;

  if (currentVersion === SEED_VERSION && hasData) {
    return { inserted: false, reason: 'up-to-date', counts: ZERO_COUNTS };
  }

  const counts = await insertAll(opts.db, data);
  await opts.storage.setItem(SEED_VERSION_KEY, SEED_VERSION);

  return {
    inserted: true,
    reason: currentVersion === null ? 'fresh-install' : 'self-heal',
    counts,
  };
}

async function insertAll(
  db: DrizzleDb,
  data: SeedDataset,
): Promise<{ locations: number; operators: number; vehicles: number }> {
  const locationRows = data.airports.map((airport) => ({
    name: airport.name,
    city: airport.city ?? null,
    country: airport.country,
    lat: airport.lat,
    lng: airport.lng,
    type: 'airport' as const,
    iata: airport.iata,
    icao: airport.icao,
    isSystemSeed: true,
  }));

  const operatorRows = data.airlines.map((airline) => ({
    name: airline.name,
    code: airline.iata ?? airline.icao,
    modes: ['flight' as const],
    country: airline.country ?? null,
    isSystemSeed: true,
  }));

  const vehicleRows = data.aircraft.map((aircraft) => ({
    mode: 'flight' as const,
    code: aircraft.code,
    category: aircraft.category ?? null,
    manufacturer: aircraft.manufacturer,
    model: aircraft.model,
    capacity: aircraft.capacity ?? null,
    isSystemSeed: true,
  }));

  if (locationRows.length > 0) {
    await db.insert(locations).values(locationRows);
  }
  if (operatorRows.length > 0) {
    await db.insert(operators).values(operatorRows);
  }
  if (vehicleRows.length > 0) {
    await db.insert(vehicles).values(vehicleRows);
  }

  return {
    locations: locationRows.length,
    operators: operatorRows.length,
    vehicles: vehicleRows.length,
  };
}
