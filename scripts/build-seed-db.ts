// Builds assets/seed/trazia-seed.db from the JSON catalogues under
// assets/static/. Generated at build-time, shipped with the app bundle,
// and bulk-loaded into the device DB on first launch (or seed-version
// upgrade) — replacing ~4700 INSERT statements with a single ATTACH +
// `INSERT ... SELECT`, which is 5–15× faster on mid-range devices.
//
// Run with `npm run build:seed-db` (Node 24 strips TS types natively).
//
// Single source of truth for the schema is src/db/schema.sql.
// The matching test src/db/__tests__/seedDb.test.ts verifies that the
// schema there stays 1:1 with the Drizzle migrations.

import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const staticDir = resolve(repoRoot, 'assets', 'static');
const seedDir = resolve(repoRoot, 'assets', 'seed');
const schemaPath = resolve(repoRoot, 'src', 'db', 'schema.sql');
const seedDbPath = resolve(seedDir, 'trazia-seed.db');
const tmpPath = resolve('/tmp', 'trazia-seed-build.db');

interface AirportRecord {
  iata: string | null;
  icao: string | null;
  name: string;
  city?: string | null;
  country: string;
  lat: number;
  lng: number;
}

interface AirlineRecord {
  iata: string | null;
  icao: string | null;
  name: string;
  country?: string | null;
}

interface AircraftRecord {
  code: string;
  manufacturer: string;
  model: string;
  category?: string | null;
  capacity?: number | null;
}

interface TrainStationRecord {
  ibnr: string;
  name: string;
  city?: string | null;
  country: string;
  lat: number;
  lng: number;
}

interface RailwayOperatorRecord {
  code: string;
  name: string;
  country?: string | null;
  modes?: ('train' | 'flight' | 'car' | 'ship')[];
}

interface TrainRecord {
  code: string;
  manufacturer: string;
  model: string;
  category?: string | null;
}

function loadJson<T>(name: string): T[] {
  const filePath = resolve(staticDir, name);
  if (!existsSync(filePath)) {
    throw new Error(
      `Missing static catalogue: ${filePath}. Run \`npm run build:static-data\` first ` +
        `to fetch upstream sources before building the seed-db.`,
    );
  }
  return JSON.parse(readFileSync(filePath, 'utf8')) as T[];
}

function uuid(): string {
  return globalThis.crypto.randomUUID();
}

interface BuildStats {
  locations: number;
  operators: number;
  vehicles: number;
  durationMs: number;
  fileSizeBytes: number;
}

function buildSeedDb(): BuildStats {
  const startedAt = Date.now();

  const airports = loadJson<AirportRecord>('airports.json');
  const airlines = loadJson<AirlineRecord>('airlines.json');
  const aircraft = loadJson<AircraftRecord>('aircraft.json');
  const stations = loadJson<TrainStationRecord>('train_stations.json');
  const railwayOps = loadJson<RailwayOperatorRecord>('railway_operators.json');
  const trains = loadJson<TrainRecord>('trains.json');

  if (existsSync(tmpPath)) unlinkSync(tmpPath);
  if (!existsSync(seedDir)) mkdirSync(seedDir, { recursive: true });

  const sqlite = new Database(tmpPath);
  sqlite.pragma('journal_mode = DELETE'); // single-file output, no WAL companions
  sqlite.pragma('foreign_keys = ON');

  const schemaSql = readFileSync(schemaPath, 'utf8');
  sqlite.exec(schemaSql);

  const insertLocation = sqlite.prepare(
    `INSERT INTO locations (id, name, city, country, lat, lng, type, iata, icao, ibnr, unlocode, is_system_seed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  );
  const insertOperator = sqlite.prepare(
    `INSERT INTO operators (id, name, code, modes, country, logo_path, is_system_seed)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  );
  const insertVehicle = sqlite.prepare(
    `INSERT INTO vehicles (id, mode, code, category, manufacturer, model, capacity, is_system_seed)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  );

  const seenAirports = new Set<string>();
  const seenStations = new Set<string>();
  const seenOperators = new Set<string>();
  const seenAircraft = new Set<string>();
  const seenTrains = new Set<string>();

  let locationCount = 0;
  let operatorCount = 0;
  let vehicleCount = 0;

  const tx = sqlite.transaction(() => {
    for (const a of airports) {
      if (!a.iata || seenAirports.has(a.iata)) continue;
      seenAirports.add(a.iata);
      insertLocation.run(
        uuid(),
        a.name,
        a.city ?? null,
        a.country,
        a.lat,
        a.lng,
        'airport',
        a.iata,
        a.icao,
        null,
        null,
      );
      locationCount++;
    }

    for (const s of stations) {
      if (!s.ibnr || seenStations.has(s.ibnr)) continue;
      seenStations.add(s.ibnr);
      insertLocation.run(
        uuid(),
        s.name,
        s.city ?? null,
        s.country,
        s.lat,
        s.lng,
        'train_station',
        null,
        null,
        s.ibnr,
        null,
      );
      locationCount++;
    }

    for (const a of airlines) {
      const code = a.iata ?? a.icao;
      if (!code || seenOperators.has(`flight:${code}`)) continue;
      seenOperators.add(`flight:${code}`);
      insertOperator.run(
        uuid(),
        a.name,
        code,
        JSON.stringify(['flight']),
        a.country ?? null,
        null,
      );
      operatorCount++;
    }

    for (const o of railwayOps) {
      if (!o.code || seenOperators.has(`train:${o.code}`)) continue;
      seenOperators.add(`train:${o.code}`);
      const modes = o.modes ?? ['train'];
      insertOperator.run(uuid(), o.name, o.code, JSON.stringify(modes), o.country ?? null, null);
      operatorCount++;
    }

    for (const v of aircraft) {
      if (!v.code || seenAircraft.has(v.code)) continue;
      seenAircraft.add(v.code);
      insertVehicle.run(
        uuid(),
        'flight',
        v.code,
        v.category ?? null,
        v.manufacturer,
        v.model,
        v.capacity ?? null,
      );
      vehicleCount++;
    }

    for (const t of trains) {
      if (!t.code || seenTrains.has(t.code)) continue;
      seenTrains.add(t.code);
      insertVehicle.run(
        uuid(),
        'train',
        t.code,
        t.category ?? null,
        t.manufacturer,
        t.model,
        null,
      );
      vehicleCount++;
    }
  });

  tx();

  sqlite.exec('VACUUM');
  sqlite.close();

  if (existsSync(seedDbPath)) unlinkSync(seedDbPath);
  writeFileSync(seedDbPath, readFileSync(tmpPath));
  unlinkSync(tmpPath);

  const fileSizeBytes = statSync(seedDbPath).size;
  const durationMs = Date.now() - startedAt;

  return {
    locations: locationCount,
    operators: operatorCount,
    vehicles: vehicleCount,
    durationMs,
    fileSizeBytes,
  };
}

const stats = buildSeedDb();
const mb = (stats.fileSizeBytes / 1_048_576).toFixed(2);
const summary = [
  '— trazia-seed.db built —',
  `path:      ${seedDbPath}`,
  `size:      ${mb} MB (${stats.fileSizeBytes.toLocaleString()} bytes)`,
  `locations: ${stats.locations.toLocaleString()}`,
  `operators: ${stats.operators.toLocaleString()}`,
  `vehicles:  ${stats.vehicles.toLocaleString()}`,
  `duration:  ${stats.durationMs} ms`,
].join('\n');
// eslint-disable-next-line no-console
console.log(summary);
