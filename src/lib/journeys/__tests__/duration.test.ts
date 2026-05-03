import { describe, expect, it } from 'vitest';

import { computeDurationMinutes } from '../duration';

describe('computeDurationMinutes', () => {
  it('returns the difference in minutes for same-day journeys', () => {
    expect(computeDurationMinutes('14:00', '17:00', '2026-05-01')).toBe(180);
  });

  it('treats end < start as overnight (rolls into the next day)', () => {
    expect(computeDurationMinutes('23:30', '04:00', '2026-05-01')).toBe(270);
  });

  it('returns undefined when either time is missing', () => {
    expect(computeDurationMinutes(undefined, '12:00', '2026-05-01')).toBeUndefined();
    expect(computeDurationMinutes('12:00', undefined, '2026-05-01')).toBeUndefined();
    expect(computeDurationMinutes(undefined, undefined, '2026-05-01')).toBeUndefined();
    expect(computeDurationMinutes(null, '12:00', '2026-05-01')).toBeUndefined();
    expect(computeDurationMinutes('', '12:00', '2026-05-01')).toBeUndefined();
  });

  it('treats identical times as a zero-minute journey, not a 1440 wrap', () => {
    expect(computeDurationMinutes('00:00', '00:00', '2026-05-01')).toBe(0);
    expect(computeDurationMinutes('10:00', '10:00', '2026-05-01')).toBe(0);
  });

  it('returns undefined for malformed input', () => {
    expect(computeDurationMinutes('abc', '12:00', '2026-05-01')).toBeUndefined();
    expect(computeDurationMinutes('12:00', '25:00', '2026-05-01')).toBeUndefined();
    expect(computeDurationMinutes('12:60', '13:00', '2026-05-01')).toBeUndefined();
  });

  it('handles a long-haul shape (FRA → JFK 14:00 → 22:00)', () => {
    expect(computeDurationMinutes('14:00', '22:00', '2026-05-01')).toBe(480);
  });

  it('accepts single-digit hours', () => {
    expect(computeDurationMinutes('9:00', '17:00', '2026-05-01')).toBe(480);
  });
});
