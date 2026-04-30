import { count } from 'drizzle-orm';

import { db } from '@/db/client';
import { operators } from '@/db/schema';

export async function runInitialSeed(): Promise<void> {
  const [row] = await db.select({ value: count() }).from(operators);
  if ((row?.value ?? 0) > 0) return;

  // Seed payloads will be loaded from src/data/static/ once that pipeline lands.
}
