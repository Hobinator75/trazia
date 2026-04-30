import { and, eq, or, sql } from 'drizzle-orm';

import type { TransportMode } from '@/types/domain-types';

import { type Operator, operators } from '../schema';
import type { DrizzleDb } from '../types';

const SEARCH_LIMIT = 20;

export async function searchOperators(
  db: DrizzleDb,
  query: string,
  mode?: TransportMode,
): Promise<Operator[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const startsWith = `${lower}%`;
  const contains = `%${lower}%`;

  const rank = sql<number>`
    CASE
      WHEN LOWER(${operators.code}) = ${lower} THEN 0
      WHEN LOWER(${operators.name}) = ${lower} THEN 0
      WHEN LOWER(${operators.code}) LIKE ${startsWith} THEN 1
      WHEN LOWER(${operators.name}) LIKE ${startsWith} THEN 1
      ELSE 2
    END
  `;

  const matches = or(
    sql`LOWER(${operators.name}) LIKE ${contains}`,
    sql`LOWER(${operators.code}) LIKE ${contains}`,
  );

  // operators.modes is a JSON array column. SQLite stores it as TEXT, so we
  // pattern-match the serialized array. Mode tokens are short and known
  // ('flight', 'train', ...), so the surrounding double-quotes prevent any
  // false positives from substring matches.
  const modeFilter = mode ? sql`${operators.modes} LIKE ${`%"${mode}"%`}` : undefined;

  const where = modeFilter ? and(matches, modeFilter) : matches;

  return db.select().from(operators).where(where).orderBy(rank, operators.name).limit(SEARCH_LIMIT);
}

export async function getOperatorById(db: DrizzleDb, id: string): Promise<Operator | undefined> {
  const rows = await db.select().from(operators).where(eq(operators.id, id)).limit(1);
  return rows[0];
}

export async function getOperatorByCode(
  db: DrizzleDb,
  code: string,
): Promise<Operator | undefined> {
  const rows = await db
    .select()
    .from(operators)
    .where(eq(operators.code, code.toUpperCase()))
    .limit(1);
  return rows[0];
}
