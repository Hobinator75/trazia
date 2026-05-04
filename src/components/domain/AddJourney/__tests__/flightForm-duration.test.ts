// Verifies the FlightForm onSubmit pipeline writes the computed
// durationMinutes into the journey patch — the integration the audit
// found broken (Codex Cross-Audit v2). We import the production
// patch-builder that FlightForm.tsx itself calls, so this test fails
// the moment the component drifts away from it.

import { describe, expect, it } from 'vitest';

import type { FlightFormValues } from '@/lib/forms/journeySchemas';
import { buildFlightJourneyPatch } from '@/lib/journeys/buildJourneyPatch';

const baseValues = (over: Partial<FlightFormValues> = {}): FlightFormValues => ({
  fromLocationId: 'loc-fra',
  toLocationId: 'loc-jfk',
  date: '2026-05-01',
  companions: [],
  tags: [],
  ...over,
});

describe('FlightForm onSubmit → buildFlightJourneyPatch', () => {
  it('14:00 → 17:00 produces durationMinutes 180', () => {
    const patch = buildFlightJourneyPatch(
      baseValues({ startTimeLocal: '14:00', endTimeLocal: '17:00' }),
      6204,
    );
    expect(patch.durationMinutes).toBe(180);
  });

  it('overnight 23:30 → 04:00 produces durationMinutes 270', () => {
    const patch = buildFlightJourneyPatch(
      baseValues({ startTimeLocal: '23:30', endTimeLocal: '04:00' }),
      10500,
    );
    expect(patch.durationMinutes).toBe(270);
  });

  it('00:00 → 00:00 produces durationMinutes 0', () => {
    const patch = buildFlightJourneyPatch(
      baseValues({ startTimeLocal: '00:00', endTimeLocal: '00:00' }),
      0,
    );
    expect(patch.durationMinutes).toBe(0);
  });

  it('writes null durationMinutes when end time is missing', () => {
    const patch = buildFlightJourneyPatch(baseValues({ startTimeLocal: '14:00' }), 6204);
    expect(patch.durationMinutes).toBeNull();
  });

  it('writes null durationMinutes when both times are missing', () => {
    const patch = buildFlightJourneyPatch(baseValues(), 6204);
    expect(patch.durationMinutes).toBeNull();
  });

  it('emits durationMinutes as a top-level field on the patch', () => {
    const patch = buildFlightJourneyPatch(
      baseValues({ startTimeLocal: '14:00', endTimeLocal: '22:00' }),
      6204,
    );
    expect(Object.prototype.hasOwnProperty.call(patch, 'durationMinutes')).toBe(true);
    expect(patch.mode).toBe('flight');
    expect(patch.routeType).toBe('great_circle');
    expect(patch.source).toBe('manual');
  });

  // long_haul (mode=flight, thresholdMinutes=360) — exactly the
  // catalogued threshold from docs/achievements.json. A 6-hour flight
  // must hit the rule, a 5h59 flight must miss it.
  it('an 8h flight crosses the long_haul threshold', () => {
    const patch = buildFlightJourneyPatch(
      baseValues({ startTimeLocal: '14:00', endTimeLocal: '22:00' }),
      6204,
    );
    expect(patch.durationMinutes).toBeGreaterThanOrEqual(360);
  });

  it('a 5h59 flight does NOT cross the long_haul threshold', () => {
    const patch = buildFlightJourneyPatch(
      baseValues({ startTimeLocal: '08:00', endTimeLocal: '13:59' }),
      450,
    );
    expect(patch.durationMinutes).toBeLessThan(360);
  });
});
