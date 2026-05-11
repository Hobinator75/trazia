import { describe, expect, it } from 'vitest';

import { randomUUID } from '../uuid';

describe('randomUUID', () => {
  it('returns a v4 UUID string', () => {
    const id = randomUUID();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('returns distinct values across calls', () => {
    const ids = new Set(Array.from({ length: 64 }, () => randomUUID()));
    expect(ids.size).toBe(64);
  });
});
