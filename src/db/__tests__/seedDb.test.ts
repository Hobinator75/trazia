import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { SEED_VERSION, SEED_VERSION_KEY } from '../seed/constants';
import { loadFromSeedDb, type SeedStorage } from '../seed/loadFromSeedDb';
import { locations, operators, vehicles } from '../schema';
import { createTestDb } from './test-db';

class MemoryStorage implements SeedStorage {
  private data = new Map<string, string>();
  async getItem(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }
}

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const seedDbAssetPath = path.resolve(repoRoot, 'assets', 'seed', 'trazia-seed.db');
const schemaSqlPath = path.resolve(repoRoot, 'src', 'db', 'schema.sql');
const migrationsDir = path.resolve(repoRoot, 'src', 'db', 'migrations');

// Build a small synthetic seed-db on disk so the loader tests don't depend on
// the full bundled asset (which has 4000+ rows and is slow to scan).
function buildSyntheticSeedDb(filePath: string) {
  const sqlite = new Database(filePath);
  sqlite.pragma('journal_mode = DELETE');
  sqlite.exec(readFileSync(schemaSqlPath, 'utf8'));

  const insertLoc = sqlite.prepare(
    `INSERT INTO locations (id, name, city, country, lat, lng, type, iata, icao, ibnr, unlocode, is_system_seed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  );
  insertLoc.run(
    'seed-fra',
    'Frankfurt Airport',
    'Frankfurt',
    'DE',
    50.0379,
    8.5622,
    'airport',
    'FRA',
    'EDDF',
    null,
    null,
  );
  insertLoc.run(
    'seed-lhr',
    'London Heathrow',
    'London',
    'GB',
    51.47,
    -0.4543,
    'airport',
    'LHR',
    'EGLL',
    null,
    null,
  );
  insertLoc.run(
    'seed-bln',
    'Berlin Hbf',
    'Berlin',
    'DE',
    52.5251,
    13.3694,
    'train_station',
    null,
    null,
    '8011160',
    null,
  );

  const insertOp = sqlite.prepare(
    `INSERT INTO operators (id, name, code, modes, country, logo_path, is_system_seed)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  );
  insertOp.run('seed-lh', 'Lufthansa', 'LH', JSON.stringify(['flight']), 'DE', null);
  insertOp.run('seed-db', 'Deutsche Bahn', 'DB', JSON.stringify(['train']), 'DE', null);

  const insertVeh = sqlite.prepare(
    `INSERT INTO vehicles (id, mode, code, category, manufacturer, model, capacity, is_system_seed)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  );
  insertVeh.run('seed-738', 'flight', 'B738', 'narrowbody', 'Boeing', '737-800', 189);
  insertVeh.run('seed-ice4', 'train', 'ICE4', 'highspeed', 'Siemens', 'ICE 4', null);

  sqlite.close();
}

describe('schema.sql ↔ drizzle migrations parity', () => {
  it('the system tables in schema.sql match what `drizzle migrate` produces', () => {
    // DB-A: built from drizzle migrations
    const a = new Database(':memory:');
    // Apply each migration file in sequence (drizzle's expo migrator chain)
    const migrationFiles = [
      '0000_initial.sql',
      '0001_seed_columns.sql',
      '0002_achievement_id_migration.sql',
      '0003_more_indexes.sql',
    ];
    for (const file of migrationFiles) {
      const sql = readFileSync(path.resolve(migrationsDir, file), 'utf8');
      // Drizzle uses `--> statement-breakpoint` as separator; better-sqlite3
      // can't run multiple statements in one .exec() so we split.
      const statements = sql
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        a.exec(stmt);
      }
    }

    // DB-B: built from schema.sql
    const b = new Database(':memory:');
    b.exec(readFileSync(schemaSqlPath, 'utf8'));

    const tables = ['locations', 'operators', 'vehicles'];
    for (const table of tables) {
      const colsA = a.prepare(`PRAGMA table_info(${table})`).all();
      const colsB = b.prepare(`PRAGMA table_info(${table})`).all();
      expect(colsB, `${table} columns must match`).toEqual(colsA);

      const idxA = (
        a.prepare(`PRAGMA index_list(${table})`).all() as { name: string; unique: number }[]
      )
        .map((r) => ({ name: r.name, unique: r.unique }))
        .sort((x, y) => x.name.localeCompare(y.name));
      const idxB = (
        b.prepare(`PRAGMA index_list(${table})`).all() as { name: string; unique: number }[]
      )
        .map((r) => ({ name: r.name, unique: r.unique }))
        .sort((x, y) => x.name.localeCompare(y.name));
      expect(idxB, `${table} indexes must match`).toEqual(idxA);
    }

    a.close();
    b.close();
  });
});

describe('loadFromSeedDb', () => {
  let workDir: string;
  let seedDbPath: string;
  let handle: ReturnType<typeof createTestDb>;
  let storage: MemoryStorage;

  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'trazia-seed-test-'));
    seedDbPath = path.join(workDir, 'seed.db');
    buildSyntheticSeedDb(seedDbPath);
    handle = createTestDb();
    storage = new MemoryStorage();
  });

  afterEach(() => {
    handle.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  it('on a fresh install copies all system rows and writes seed.version', async () => {
    const result = await loadFromSeedDb({ db: handle.db, seedDbPath, storage });

    expect(result.loaded).toBe(true);
    expect(result.reason).toBe('fresh-install');
    expect(result.counts).toEqual({ locations: 3, operators: 2, vehicles: 2 });
    expect(await storage.getItem(SEED_VERSION_KEY)).toBe(SEED_VERSION);

    const locs = await handle.db.select().from(locations);
    expect(locs).toHaveLength(3);
    expect(locs.every((r) => r.isSystemSeed)).toBe(true);

    const fra = locs.find((l) => l.iata === 'FRA');
    expect(fra?.id).toBe('seed-fra');
    expect(fra?.name).toBe('Frankfurt Airport');

    const ops = await handle.db.select().from(operators);
    const db = ops.find((o) => o.code === 'DB');
    expect(db?.modes).toEqual(['train']);

    const veh = await handle.db.select().from(vehicles);
    expect(veh.find((v) => v.code === 'ICE4')?.mode).toBe('train');
  });

  it('on a second run with the current version is a no-op', async () => {
    await loadFromSeedDb({ db: handle.db, seedDbPath, storage });
    const second = await loadFromSeedDb({ db: handle.db, seedDbPath, storage });

    expect(second.loaded).toBe(false);
    expect(second.reason).toBe('up-to-date');

    const locs = await handle.db.select().from(locations);
    expect(locs).toHaveLength(3);
  });

  it('on a version-bump rebuilds the system rows but preserves user rows', async () => {
    // Simulate an existing device on an older seed-version with one stale
    // system row and one user-created row.
    await storage.setItem(SEED_VERSION_KEY, '1');
    await handle.db.insert(locations).values([
      {
        id: 'old-fra',
        name: 'Frankfurt Airport (old)',
        city: 'Frankfurt',
        country: 'DE',
        lat: 50.0,
        lng: 8.5,
        type: 'airport',
        iata: 'FRA',
        icao: 'EDDF',
        isSystemSeed: true,
      },
      {
        id: 'user-airfield',
        name: 'My private airfield',
        lat: 0,
        lng: 0,
        type: 'airport',
        isSystemSeed: false,
      },
    ]);

    const result = await loadFromSeedDb({ db: handle.db, seedDbPath, storage });
    expect(result.loaded).toBe(true);
    expect(result.reason).toBe('version-upgrade');

    const allRows = await handle.db.select().from(locations);
    // 3 system rows from seed + 1 user row preserved
    expect(allRows).toHaveLength(4);

    // The old stale FRA row was replaced by the canonical seed FRA row.
    const fra = allRows.find((r) => r.iata === 'FRA');
    expect(fra?.id).toBe('seed-fra');
    expect(fra?.name).toBe('Frankfurt Airport');

    // User row untouched.
    const userRows = allRows.filter((r) => !r.isSystemSeed);
    expect(userRows).toHaveLength(1);
    expect(userRows[0]?.id).toBe('user-airfield');

    expect(await storage.getItem(SEED_VERSION_KEY)).toBe(SEED_VERSION);
  });

  it('self-heals when seed.version is set but the table was wiped', async () => {
    await storage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    const result = await loadFromSeedDb({ db: handle.db, seedDbPath, storage });

    expect(result.loaded).toBe(true);
    expect(result.reason).toBe('self-heal');

    const locs = await handle.db.select().from(locations);
    expect(locs).toHaveLength(3);
  });

  it('rolls back on a transaction failure and leaves user data intact', async () => {
    // Pre-populate user data and one stale system row.
    await handle.db.insert(locations).values([
      {
        id: 'user-airfield',
        name: 'My private airfield',
        lat: 0,
        lng: 0,
        type: 'airport',
        isSystemSeed: false,
      },
      {
        id: 'old-system',
        name: 'old',
        lat: 1,
        lng: 1,
        type: 'airport',
        isSystemSeed: true,
      },
    ]);

    // Point loader at a seed-db whose schema is intentionally broken so the
    // INSERT FROM trazia_seed.locations fails (column count mismatch).
    const brokenPath = path.join(workDir, 'broken.db');
    const broken = new Database(brokenPath);
    broken.exec(`CREATE TABLE locations (id text);`);
    broken.exec(`CREATE TABLE operators (id text);`);
    broken.exec(`CREATE TABLE vehicles (id text);`);
    broken.exec(`INSERT INTO locations (id) VALUES ('x');`);
    broken.close();

    await expect(
      loadFromSeedDb({ db: handle.db, seedDbPath: brokenPath, storage }),
    ).rejects.toThrow();

    // Both the user row AND the pre-existing system row must survive a
    // failed migration — the transaction was rolled back.
    const allRows = await handle.db.select().from(locations);
    expect(allRows).toHaveLength(2);
    expect(allRows.find((r) => r.id === 'user-airfield')).toBeDefined();
    expect(allRows.find((r) => r.id === 'old-system')).toBeDefined();

    // seed.version stays unchanged so the next launch retries.
    expect(await storage.getItem(SEED_VERSION_KEY)).toBe(null);
  });

  it('keeps user-created rows untouched on first install', async () => {
    await handle.db.insert(locations).values({
      id: 'user-only',
      name: 'My private airfield',
      lat: 0,
      lng: 0,
      type: 'airport',
      isSystemSeed: false,
    });

    await loadFromSeedDb({ db: handle.db, seedDbPath, storage });

    const userRows = await handle.db
      .select()
      .from(locations)
      .where(eq(locations.isSystemSeed, false));
    expect(userRows).toHaveLength(1);
    expect(userRows[0]?.id).toBe('user-only');
  });
});

describe('the bundled assets/seed/trazia-seed.db', () => {
  beforeAll(() => {
    if (!existsSync(seedDbAssetPath)) {
      // Build it on demand so CI doesn't have to remember.
      execSync('npm run build:seed-db', { cwd: repoRoot, stdio: 'pipe' });
    }
  });

  it('exists, has the expected tables, and is populated', () => {
    const sqlite = new Database(seedDbAssetPath, { readonly: true });

    const tables = sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name).sort();
    expect(tableNames).toEqual(['locations', 'operators', 'vehicles']);

    const locCount = sqlite.prepare('SELECT COUNT(*) as n FROM locations').get() as { n: number };
    const opCount = sqlite.prepare('SELECT COUNT(*) as n FROM operators').get() as { n: number };
    const vehCount = sqlite.prepare('SELECT COUNT(*) as n FROM vehicles').get() as { n: number };
    // Sanity floors — actual numbers are ~3399 / ~1044 / ~222 (tracked in
    // build script output). If any source catalogue regresses we want to
    // know.
    expect(locCount.n).toBeGreaterThan(3000);
    expect(opCount.n).toBeGreaterThan(900);
    expect(vehCount.n).toBeGreaterThan(150);

    const allSystemSeed = sqlite
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM locations WHERE is_system_seed = 1) as l,
           (SELECT COUNT(*) FROM operators WHERE is_system_seed = 1) as o,
           (SELECT COUNT(*) FROM vehicles WHERE is_system_seed = 1) as v`,
      )
      .get() as { l: number; o: number; v: number };
    expect(allSystemSeed.l).toBe(locCount.n);
    expect(allSystemSeed.o).toBe(opCount.n);
    expect(allSystemSeed.v).toBe(vehCount.n);

    sqlite.close();
  });
});
