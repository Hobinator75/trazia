import { db } from '@/db/client';
import { achievements, locations, operators } from '@/db/schema';

export async function runInitialSeed(): Promise<void> {
  const [{ count: operatorCount }] = (await db
    .select({ count: operators.id })
    .from(operators)
    .limit(1)) as unknown as [{ count: number | null }];

  if (operatorCount != null) return;

  await db.insert(operators).values([]);
  await db.insert(locations).values([]);
  await db.insert(achievements).values([]);
}
