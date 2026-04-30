import { and, eq, or, sql } from 'drizzle-orm';

import type { LocationKind } from '@/types/domain-types';

import { type Location, locations } from '../schema';
import type { DrizzleDb } from '../types';

const SEARCH_LIMIT = 20;

export async function searchLocations(
  db: DrizzleDb,
  query: string,
  type?: LocationKind,
): Promise<Location[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const startsWith = `${lower}%`;
  const contains = `%${lower}%`;

  const rank = sql<number>`
    CASE
      WHEN LOWER(${locations.name}) = ${lower} THEN 0
      WHEN LOWER(${locations.iata}) = ${lower} THEN 0
      WHEN LOWER(${locations.icao}) = ${lower} THEN 0
      WHEN LOWER(${locations.name}) LIKE ${startsWith} THEN 1
      WHEN LOWER(${locations.iata}) LIKE ${startsWith} THEN 1
      WHEN LOWER(${locations.icao}) LIKE ${startsWith} THEN 1
      WHEN LOWER(${locations.city}) LIKE ${startsWith} THEN 2
      ELSE 3
    END
  `;

  const matches = or(
    sql`LOWER(${locations.name}) LIKE ${contains}`,
    sql`LOWER(${locations.city}) LIKE ${contains}`,
    sql`LOWER(${locations.iata}) LIKE ${contains}`,
    sql`LOWER(${locations.icao}) LIKE ${contains}`,
  );

  const where = type ? and(matches, eq(locations.type, type)) : matches;

  return db.select().from(locations).where(where).orderBy(rank, locations.name).limit(SEARCH_LIMIT);
}

export async function getLocationById(db: DrizzleDb, id: string): Promise<Location | undefined> {
  const rows = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
  return rows[0];
}

export async function getLocationByIata(
  db: DrizzleDb,
  iata: string,
): Promise<Location | undefined> {
  const rows = await db
    .select()
    .from(locations)
    .where(eq(locations.iata, iata.toUpperCase()))
    .limit(1);
  return rows[0];
}

export async function getLocationByIcao(
  db: DrizzleDb,
  icao: string,
): Promise<Location | undefined> {
  const rows = await db
    .select()
    .from(locations)
    .where(eq(locations.icao, icao.toUpperCase()))
    .limit(1);
  return rows[0];
}
