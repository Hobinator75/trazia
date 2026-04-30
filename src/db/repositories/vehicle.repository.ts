import { and, eq, or, sql } from 'drizzle-orm';

import type { TransportMode } from '@/types/domain-types';

import { type Vehicle, vehicles } from '../schema';
import type { DrizzleDb } from '../types';

const SEARCH_LIMIT = 20;

export async function searchVehicles(
  db: DrizzleDb,
  query: string,
  mode?: TransportMode,
): Promise<Vehicle[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const startsWith = `${lower}%`;
  const contains = `%${lower}%`;

  const rank = sql<number>`
    CASE
      WHEN LOWER(${vehicles.code}) = ${lower} THEN 0
      WHEN LOWER(${vehicles.model}) = ${lower} THEN 0
      WHEN LOWER(${vehicles.code}) LIKE ${startsWith} THEN 1
      WHEN LOWER(${vehicles.model}) LIKE ${startsWith} THEN 1
      WHEN LOWER(${vehicles.manufacturer}) LIKE ${startsWith} THEN 2
      ELSE 3
    END
  `;

  const matches = or(
    sql`LOWER(${vehicles.code}) LIKE ${contains}`,
    sql`LOWER(${vehicles.model}) LIKE ${contains}`,
    sql`LOWER(${vehicles.manufacturer}) LIKE ${contains}`,
  );

  const where = mode ? and(matches, eq(vehicles.mode, mode)) : matches;

  return db.select().from(vehicles).where(where).orderBy(rank, vehicles.model).limit(SEARCH_LIMIT);
}

export async function getVehicleById(db: DrizzleDb, id: string): Promise<Vehicle | undefined> {
  const rows = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  return rows[0];
}

export async function getVehicleByCode(db: DrizzleDb, code: string): Promise<Vehicle | undefined> {
  const rows = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.code, code.toUpperCase()))
    .limit(1);
  return rows[0];
}
