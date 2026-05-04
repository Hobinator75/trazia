import { describe, expect, it } from 'vitest';

import { FEATURE_FLAGS } from '../featureFlags';
import { ALL_MODES, MODES, PHASE_1_VISIBLE_MODES } from '@/components/domain/modePickerConfig';

describe('Phase-1 launch feature flags', () => {
  it('hides train, car, ship, bus by default for the launch build', () => {
    expect(FEATURE_FLAGS.PHASE_2_TRAIN_VISIBLE).toBe(false);
    expect(FEATURE_FLAGS.PHASE_3_CAR_VISIBLE).toBe(false);
    expect(FEATURE_FLAGS.PHASE_4_SHIP_VISIBLE).toBe(false);
  });

  it('PHASE_1_VISIBLE_MODES exposes only Flight + Other', () => {
    const ids = PHASE_1_VISIBLE_MODES.map((m) => m.value);
    expect(ids).toEqual(['flight', 'other']);
  });

  it('MODES alias points at the Phase-1 visible list', () => {
    expect(MODES).toBe(PHASE_1_VISIBLE_MODES);
  });

  it('hides Train/Car/Ship/Bus from the picker entirely (no locked tiles)', () => {
    const visibleIds = PHASE_1_VISIBLE_MODES.map((m) => m.value);
    expect(visibleIds).not.toContain('train');
    expect(visibleIds).not.toContain('car');
    expect(visibleIds).not.toContain('ship');
    expect(visibleIds).not.toContain('bus');
  });

  it('keeps all mode definitions in ALL_MODES so existing data stays editable', () => {
    const allIds = ALL_MODES.map((m) => m.value);
    expect(allIds).toEqual(['flight', 'train', 'car', 'ship', 'bus', 'other']);
  });
});
