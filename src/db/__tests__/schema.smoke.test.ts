import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { journeys, locations, operators } from '../schema';
import { createTestDb, type TestDb } from './test-db';

describe('db schema smoke', () => {
  let handle: ReturnType<typeof createTestDb>;
  let db: TestDb;

  beforeEach(() => {
    handle = createTestDb();
    db = handle.db;
  });

  afterEach(() => {
    handle.close();
  });

  it('creates the database and applies migrations without throwing', () => {
    const tables = handle.sqlite
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'`,
      )
      .all() as { name: string }[];

    const names = tables.map((t) => t.name).sort();
    expect(names).toEqual([
      'achievement_unlocks',
      'journey_companions',
      'journey_photos',
      'journey_tags',
      'journeys',
      'locations',
      'operators',
      'trip_journeys',
      'trips',
      'vehicles',
    ]);
  });

  it('records the migration in the drizzle bookkeeping table', () => {
    const rows = handle.sqlite.prepare(`SELECT hash FROM __drizzle_migrations`).all() as {
      hash: string;
    }[];

    expect(rows.length).toBe(1);
    expect(rows[0]?.hash).toBeTypeOf('string');
  });

  it('inserts a journey with locations + operator and reads it back', async () => {
    const fromId = crypto.randomUUID();
    const toId = crypto.randomUUID();
    const operatorId = crypto.randomUUID();
    const journeyId = crypto.randomUUID();

    await db.insert(locations).values([
      {
        id: fromId,
        name: 'Berlin Hauptbahnhof',
        city: 'Berlin',
        country: 'DE',
        lat: 52.525,
        lng: 13.3695,
        type: 'station',
        ibnr: '8011160',
      },
      {
        id: toId,
        name: 'München Hauptbahnhof',
        city: 'München',
        country: 'DE',
        lat: 48.1402,
        lng: 11.5586,
        type: 'station',
        ibnr: '8000261',
      },
    ]);

    await db.insert(operators).values({
      id: operatorId,
      name: 'Deutsche Bahn',
      code: 'DB',
      modes: ['train'],
      country: 'DE',
    });

    await db.insert(journeys).values({
      id: journeyId,
      mode: 'train',
      fromLocationId: fromId,
      toLocationId: toId,
      date: '2026-04-15',
      startTimeLocal: '08:34',
      endTimeLocal: '12:30',
      startTimezone: 'Europe/Berlin',
      endTimezone: 'Europe/Berlin',
      operatorId,
      serviceNumber: 'ICE 525',
      cabinClass: '2',
      seatNumber: '23A',
      distanceKm: 504.2,
      durationMinutes: 236,
      routeType: 'rail',
      isManualEntry: true,
      source: 'manual',
    });

    const rows = await db.select().from(journeys).where(eq(journeys.id, journeyId));

    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.mode).toBe('train');
    expect(row.fromLocationId).toBe(fromId);
    expect(row.toLocationId).toBe(toId);
    expect(row.operatorId).toBe(operatorId);
    expect(row.distanceKm).toBeCloseTo(504.2, 5);
    expect(row.isManualEntry).toBe(true);
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it('persists JSON modes on operators as a real array', async () => {
    const operatorId = crypto.randomUUID();
    await db.insert(operators).values({
      id: operatorId,
      name: 'Lufthansa',
      code: 'LH',
      modes: ['flight'],
      country: 'DE',
    });

    const [row] = await db.select().from(operators).where(eq(operators.id, operatorId));
    expect(row?.modes).toEqual(['flight']);
  });

  it('rejects a journey that references unknown locations (FK)', async () => {
    expect(() =>
      handle.sqlite
        .prepare(
          `INSERT INTO journeys (id, mode, from_location_id, to_location_id, date, is_manual_entry)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(crypto.randomUUID(), 'train', 'missing-from', 'missing-to', '2026-01-01', 1),
    ).toThrow(/FOREIGN KEY/i);
  });
});
