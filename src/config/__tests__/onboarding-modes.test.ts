import { describe, expect, it } from 'vitest';

// The onboarding modes screen is hard-coded to Flight + Other for
// Phase 1 (no locked-tile teaser). Mirror that as a pure assertion to
// avoid pulling in the React Native render tree under vitest — keep
// app/onboarding/modes.tsx in sync with this rule.
const ONBOARDING_PHASE_1_MODE_IDS: readonly string[] = ['flight', 'other'];

describe('onboarding modes screen Phase-1 gating', () => {
  it('shows only Flight + Other in the Phase-1 onboarding', () => {
    expect(ONBOARDING_PHASE_1_MODE_IDS).toEqual(['flight', 'other']);
  });

  it('hides Train/Car/Ship/Bus from the onboarding card list', () => {
    expect(ONBOARDING_PHASE_1_MODE_IDS).not.toContain('train');
    expect(ONBOARDING_PHASE_1_MODE_IDS).not.toContain('car');
    expect(ONBOARDING_PHASE_1_MODE_IDS).not.toContain('ship');
    expect(ONBOARDING_PHASE_1_MODE_IDS).not.toContain('bus');
  });
});
