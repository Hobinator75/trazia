import { describe, expect, it } from 'vitest';

import {
  flightFormSchema,
  otherFormSchema,
  parseDistanceInput,
  trainFormSchema,
} from '../journeySchemas';

describe('flightFormSchema', () => {
  const valid = {
    fromLocationId: 'loc-fra',
    toLocationId: 'loc-jfk',
    date: '2026-04-15',
    companions: [],
    tags: [],
  } as const;

  it('accepts a minimal valid flight', () => {
    expect(flightFormSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty fromLocationId', () => {
    const r = flightFormSchema.safeParse({ ...valid, fromLocationId: '' });
    expect(r.success).toBe(false);
  });

  it('rejects fromLocationId === toLocationId', () => {
    const r = flightFormSchema.safeParse({
      ...valid,
      fromLocationId: 'same',
      toLocationId: 'same',
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    expect(flightFormSchema.safeParse({ ...valid, date: '15/04/2026' }).success).toBe(false);
    expect(flightFormSchema.safeParse({ ...valid, date: '2026-4-15' }).success).toBe(false);
  });

  it('accepts known cabin classes only', () => {
    expect(flightFormSchema.safeParse({ ...valid, cabinClass: 'business' }).success).toBe(true);
    expect(flightFormSchema.safeParse({ ...valid, cabinClass: 'cargo' }).success).toBe(false);
  });

  it('caps notes at 500 chars', () => {
    expect(
      flightFormSchema.safeParse({ ...valid, notes: 'a'.repeat(500) }).success,
    ).toBe(true);
    expect(
      flightFormSchema.safeParse({ ...valid, notes: 'a'.repeat(501) }).success,
    ).toBe(false);
  });
});

describe('trainFormSchema', () => {
  const valid = {
    fromLocationId: 'berlin-hbf',
    toLocationId: 'munich-hbf',
    date: '2026-04-15',
    companions: [],
    tags: [],
  } as const;

  it('accepts a minimal valid train ride', () => {
    expect(trainFormSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects same from/to', () => {
    expect(
      trainFormSchema.safeParse({ ...valid, fromLocationId: 'a', toLocationId: 'a' }).success,
    ).toBe(false);
  });

  it('accepts trainClass enum values', () => {
    expect(trainFormSchema.safeParse({ ...valid, trainClass: 'sleeper' }).success).toBe(true);
    expect(trainFormSchema.safeParse({ ...valid, trainClass: 'business' }).success).toBe(false);
  });
});

describe('otherFormSchema', () => {
  const valid = {
    submode: 'walk' as const,
    fromText: 'Home',
    toText: 'Park',
    date: '2026-04-15',
    tags: [],
  };

  it('accepts walk/bike/other submodes', () => {
    expect(otherFormSchema.safeParse(valid).success).toBe(true);
    expect(otherFormSchema.safeParse({ ...valid, submode: 'bike' }).success).toBe(true);
    expect(otherFormSchema.safeParse({ ...valid, submode: 'other' }).success).toBe(true);
  });

  it('rejects unknown submode', () => {
    expect(otherFormSchema.safeParse({ ...valid, submode: 'flight' }).success).toBe(false);
  });

  it('rejects empty fromText / toText', () => {
    expect(otherFormSchema.safeParse({ ...valid, fromText: '' }).success).toBe(false);
    expect(otherFormSchema.safeParse({ ...valid, toText: '' }).success).toBe(false);
  });

  it('distanceKm accepts numeric strings, rejects non-numeric', () => {
    expect(otherFormSchema.safeParse({ ...valid, distanceKm: '12.5' }).success).toBe(true);
    expect(otherFormSchema.safeParse({ ...valid, distanceKm: '' }).success).toBe(true);
    expect(otherFormSchema.safeParse({ ...valid, distanceKm: 'abc' }).success).toBe(false);
  });
});

describe('parseDistanceInput', () => {
  it('returns null for empty / undefined', () => {
    expect(parseDistanceInput(undefined)).toBeNull();
    expect(parseDistanceInput('')).toBeNull();
    expect(parseDistanceInput('   ')).toBeNull();
  });

  it('parses comma- and dot-decimal numbers', () => {
    expect(parseDistanceInput('12.5')).toBe(12.5);
    expect(parseDistanceInput('12,5')).toBe(12.5);
    expect(parseDistanceInput(' 1000 ')).toBe(1000);
  });

  it('returns null for non-numeric input', () => {
    expect(parseDistanceInput('foo')).toBeNull();
  });
});
