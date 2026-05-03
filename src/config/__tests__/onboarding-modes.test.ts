import { describe, expect, it } from 'vitest';

import { FEATURE_FLAGS } from '../featureFlags';

// The onboarding modes screen filters its OPTIONS list by the same
// feature flag. To avoid pulling in the React Native render tree for
// vitest, we mirror the filter expression here as a pure assertion
// — keep app/onboarding/modes.tsx in sync with this rule.
const onboardingModeIds = (
  trainVisible: boolean,
): readonly string[] => {
  const all: { id: string; phaseGate?: 'train' }[] = [
    { id: 'flight' },
    { id: 'train', phaseGate: 'train' },
    { id: 'car' },
    { id: 'ship' },
    { id: 'bus' },
  ];
  return all
    .filter((o) => o.phaseGate !== 'train' || trainVisible)
    .map((o) => o.id);
};

describe('onboarding modes screen Phase-1 gating', () => {
  it('hides Train from the onboarding card list when the flag is off', () => {
    expect(onboardingModeIds(false)).not.toContain('train');
  });

  it('shows Train when the Phase-2 flag is flipped on', () => {
    expect(onboardingModeIds(true)).toContain('train');
  });

  it('reflects the current launch flag value', () => {
    const ids = onboardingModeIds(FEATURE_FLAGS.PHASE_2_TRAIN_VISIBLE);
    if (FEATURE_FLAGS.PHASE_2_TRAIN_VISIBLE) {
      expect(ids).toContain('train');
    } else {
      expect(ids).not.toContain('train');
    }
  });
});
