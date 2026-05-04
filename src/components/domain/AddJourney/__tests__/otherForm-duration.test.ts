// Mirrors flightForm-duration.test.ts but for the OtherForm pipeline.
// Same bug class — duplicating the patch-builder logic in the test
// would let the form drift from the test silently — so we import the
// real production helper.

import { describe, expect, it } from 'vitest';

import type { OtherFormValues } from '@/lib/forms/journeySchemas';
import { buildOtherJourneyPatch } from '@/lib/journeys/buildJourneyPatch';

const baseValues = (over: Partial<OtherFormValues> = {}): OtherFormValues => ({
  submode: 'walk',
  fromText: 'Zuhause',
  toText: 'Park',
  date: '2026-05-01',
  tags: [],
  ...over,
});

const baseInputs = {
  fromLocationId: 'adhoc:zuhause',
  toLocationId: 'adhoc:park',
  distanceKm: 1.2,
};

describe('OtherForm onSubmit → buildOtherJourneyPatch', () => {
  it('14:00 → 17:00 produces durationMinutes 180', () => {
    const patch = buildOtherJourneyPatch(
      baseValues({ startTimeLocal: '14:00', endTimeLocal: '17:00' }),
      baseInputs,
    );
    expect(patch.durationMinutes).toBe(180);
  });

  it('overnight 23:30 → 04:00 produces durationMinutes 270', () => {
    const patch = buildOtherJourneyPatch(
      baseValues({ startTimeLocal: '23:30', endTimeLocal: '04:00' }),
      baseInputs,
    );
    expect(patch.durationMinutes).toBe(270);
  });

  it('00:00 → 00:00 produces durationMinutes 0', () => {
    const patch = buildOtherJourneyPatch(
      baseValues({ startTimeLocal: '00:00', endTimeLocal: '00:00' }),
      baseInputs,
    );
    expect(patch.durationMinutes).toBe(0);
  });

  it('writes null durationMinutes when end time is missing', () => {
    const patch = buildOtherJourneyPatch(
      baseValues({ startTimeLocal: '14:00' }),
      baseInputs,
    );
    expect(patch.durationMinutes).toBeNull();
  });

  it('maps each submode to its own TransportMode', () => {
    expect(buildOtherJourneyPatch(baseValues({ submode: 'walk' }), baseInputs).mode).toBe('walk');
    expect(buildOtherJourneyPatch(baseValues({ submode: 'bike' }), baseInputs).mode).toBe('bike');
    expect(buildOtherJourneyPatch(baseValues({ submode: 'other' }), baseInputs).mode).toBe('other');
  });

  it('emits source string with the submode tail and routeType bezier', () => {
    const patch = buildOtherJourneyPatch(
      baseValues({ submode: 'bike', startTimeLocal: '14:00', endTimeLocal: '15:00' }),
      baseInputs,
    );
    expect(patch.source).toBe('manual:bike');
    expect(patch.routeType).toBe('bezier');
    expect(Object.prototype.hasOwnProperty.call(patch, 'durationMinutes')).toBe(true);
  });
});
