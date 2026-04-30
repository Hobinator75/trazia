import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { operators, type NewOperator, type Operator } from '@/db/schema';

export const operatorRepository = {
  async list(): Promise<Operator[]> {
    return db.select().from(operators);
  },

  async getById(id: string): Promise<Operator | undefined> {
    const rows = await db.select().from(operators).where(eq(operators.id, id)).limit(1);
    return rows[0];
  },

  async upsert(value: NewOperator): Promise<void> {
    await db
      .insert(operators)
      .values(value)
      .onConflictDoUpdate({ target: operators.id, set: value });
  },
};
