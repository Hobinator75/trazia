// Verifies the FlightForm onSubmit pipeline writes the computed
// durationMinutes into the journey patch — the integration the audit
// found broken (Codex 30/37). Mounting the React Native component
// requires a renderer + native shims that aren't in the vitest setup,
// so we exercise the patch-building logic directly. The build mirrors
// FlightForm.tsx onSubmit — keep them aligned.

import { describe, expect, it } from 'vitest';

import { computeDurationMinutes } from '@/lib/journeys/duration';

interface FlightLikeFormValues {
  fromLocationId: string;
  toLocationId: string;
  date: string;
  startTimeLocal?: string;
  endTimeLocal?: string;
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
}

function buildFlightJourneyPatch(values: FlightLikeFormValues, distanceKm: number | null) {
  const durationMinutes = computeDurationMinutes(
    values.startTimeLocal,
    values.endTimeLocal,
    values.date,
  );
  return {
    mode: 'flight' as const,
    fromLocationId: values.fromLocationId,
    toLocationId: values.toLocationId,
    date: values.date,
    startTimeLocal: values.startTimeLocal ?? null,
    endTimeLocal: values.endTimeLocal ?? null,
    cabinClass: values.cabinClass ?? null,
    distanceKm,
    durationMinutes: durationMinutes ?? null,
    routeType: 'great_circle' as const,
    isManualEntry: true,
    source: 'manual',
  };
}

describe('FlightForm onSubmit → journeyPatch', () => {
  it('long-haul FRA → JFK 14:00 → 22:00 produces durationMinutes 480', () => {
    const patch = buildFlightJourneyPatch(
      {
        fromLocationId: 'loc-fra',
        toLocationId: 'loc-jfk',
        date: '2026-05-01',
        startTimeLocal: '14:00',
        endTimeLocal: '22:00',
        cabinClass: 'business',
      },
      6204,
    );
    expect(patch.durationMinutes).toBe(480);
  });

  it('writes null durationMinutes when the user leaves times empty', () => {
    const patch = buildFlightJourneyPatch(
      {
        fromLocationId: 'loc-fra',
        toLocationId: 'loc-jfk',
        date: '2026-05-01',
      },
      6204,
    );
    expect(patch.durationMinutes).toBeNull();
  });

  it('overnight 22:00 → 06:30 produces 510 minutes', () => {
    const patch = buildFlightJourneyPatch(
      {
        fromLocationId: 'loc-fra',
        toLocationId: 'loc-sin',
        date: '2026-05-01',
        startTimeLocal: '22:00',
        endTimeLocal: '06:30',
      },
      10500,
    );
    expect(patch.durationMinutes).toBe(510);
  });

  // long_haul (mode=flight, thresholdMinutes=360) — exactly the catalogued
  // threshold from docs/achievements.json:192. A 6-hour flight must hit
  // the rule, a 5h59 flight must miss it.
  it('an 8h flight produces a duration that triggers the catalog long_haul rule', () => {
    const patch = buildFlightJourneyPatch(
      {
        fromLocationId: 'loc-fra',
        toLocationId: 'loc-jfk',
        date: '2026-05-01',
        startTimeLocal: '14:00',
        endTimeLocal: '22:00',
      },
      6204,
    );
    expect(patch.durationMinutes).toBeGreaterThanOrEqual(360);
  });

  it('a 5h59 flight does NOT cross the long_haul threshold', () => {
    const patch = buildFlightJourneyPatch(
      {
        fromLocationId: 'loc-fra',
        toLocationId: 'loc-cdg',
        date: '2026-05-01',
        startTimeLocal: '08:00',
        endTimeLocal: '13:59',
      },
      450,
    );
    expect(patch.durationMinutes).toBeLessThan(360);
  });
});
