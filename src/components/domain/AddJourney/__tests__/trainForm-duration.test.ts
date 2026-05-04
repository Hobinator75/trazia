// Mirrors flightForm-duration.test.ts but for the TrainForm pipeline.
// Same bug class — duplicating the patch-builder logic in the test
// would let the form drift from the test silently — so we import the
// real production helper.

import { describe, expect, it } from 'vitest';

import type { TrainFormValues } from '@/lib/forms/journeySchemas';
import { buildTrainJourneyPatch } from '@/lib/journeys/buildJourneyPatch';

const baseValues = (over: Partial<TrainFormValues> = {}): TrainFormValues => ({
  fromLocationId: 'loc-fra-hbf',
  toLocationId: 'loc-zrh-hb',
  date: '2026-05-01',
  companions: [],
  tags: [],
  ...over,
});

describe('TrainForm onSubmit → buildTrainJourneyPatch', () => {
  it('14:00 → 17:00 produces durationMinutes 180', () => {
    const patch = buildTrainJourneyPatch(
      baseValues({ startTimeLocal: '14:00', endTimeLocal: '17:00' }),
      450,
    );
    expect(patch.durationMinutes).toBe(180);
  });

  it('overnight 23:30 → 04:00 produces durationMinutes 270', () => {
    const patch = buildTrainJourneyPatch(
      baseValues({ startTimeLocal: '23:30', endTimeLocal: '04:00' }),
      450,
    );
    expect(patch.durationMinutes).toBe(270);
  });

  it('00:00 → 00:00 produces durationMinutes 0', () => {
    const patch = buildTrainJourneyPatch(
      baseValues({ startTimeLocal: '00:00', endTimeLocal: '00:00' }),
      0,
    );
    expect(patch.durationMinutes).toBe(0);
  });

  it('writes null durationMinutes when end time is missing', () => {
    const patch = buildTrainJourneyPatch(
      baseValues({ startTimeLocal: '14:00' }),
      450,
    );
    expect(patch.durationMinutes).toBeNull();
  });

  it('emits durationMinutes as a top-level field on the patch', () => {
    const patch = buildTrainJourneyPatch(
      baseValues({ startTimeLocal: '14:00', endTimeLocal: '17:00' }),
      450,
    );
    expect(Object.prototype.hasOwnProperty.call(patch, 'durationMinutes')).toBe(true);
    expect(patch.mode).toBe('train');
    expect(patch.routeType).toBe('bezier');
    expect(patch.source).toBe('manual');
  });

  it('maps trainClass into cabinClass', () => {
    const patch = buildTrainJourneyPatch(
      baseValues({ startTimeLocal: '08:00', endTimeLocal: '10:00', trainClass: 'first' }),
      150,
    );
    expect(patch.cabinClass).toBe('first');
  });
});
