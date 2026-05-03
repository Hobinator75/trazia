import { describe, expect, it } from 'vitest';

import { FEATURE_FLAGS } from '../featureFlags';
import { MODES } from '@/components/domain/modePickerConfig';

describe('Phase-1 launch feature flags', () => {
  it('hides train, car, ship, bus by default for the launch build', () => {
    expect(FEATURE_FLAGS.PHASE_2_TRAIN_VISIBLE).toBe(false);
    expect(FEATURE_FLAGS.PHASE_3_CAR_VISIBLE).toBe(false);
    expect(FEATURE_FLAGS.PHASE_4_SHIP_VISIBLE).toBe(false);
  });

  it('ModePicker keeps Train as a locked tile reflecting PHASE_2_TRAIN_VISIBLE', () => {
    const train = MODES.find((m) => m.value === 'train');
    expect(train).toBeDefined();
    expect(train?.enabled).toBe(FEATURE_FLAGS.PHASE_2_TRAIN_VISIBLE);
  });

  it('ModePicker still exposes Flight + Other as the Phase-1 active modes', () => {
    const flight = MODES.find((m) => m.value === 'flight');
    const other = MODES.find((m) => m.value === 'other');
    expect(flight?.enabled).toBe(true);
    expect(other?.enabled).toBe(true);
  });
});
