import { describe, expect, it } from 'vitest';

import { IMPRINT_DE, PRIVACY_POLICY_DE, TERMS_DE } from '../content';

describe('legal content (DE)', () => {
  it('privacy policy mentions every embedded SDK by name', () => {
    expect(PRIVACY_POLICY_DE).toContain('Sentry');
    expect(PRIVACY_POLICY_DE).toContain('PostHog');
    expect(PRIVACY_POLICY_DE).toContain('AdMob');
    expect(PRIVACY_POLICY_DE).toContain('RevenueCat');
  });

  it('privacy policy explains where to opt out of crash reports + analytics', () => {
    // The settings path matters — users have to find the toggles. Keep
    // these strings in sync with the actual menu labels in
    // app/(tabs)/profile/index.tsx.
    expect(PRIVACY_POLICY_DE).toContain('Crash-Reports senden');
    expect(PRIVACY_POLICY_DE).toContain('Anonyme Nutzungsstatistiken');
  });

  it('privacy policy describes the export + delete paths', () => {
    // Whitespace can wrap inside the markdown source — normalize before
    // matching so the assertion isn't tied to the line-break position.
    const normalized = PRIVACY_POLICY_DE.replace(/\s+/g, ' ');
    expect(normalized).toContain('Daten exportieren');
    expect(normalized).toContain('Alle Daten löschen');
  });

  it('privacy policy clarifies the ATT/IDFA stance', () => {
    expect(PRIVACY_POLICY_DE).toContain('ATT');
    expect(PRIVACY_POLICY_DE).toContain('IDFA');
  });

  it('imprint and terms are non-empty', () => {
    expect(IMPRINT_DE.length).toBeGreaterThan(50);
    expect(TERMS_DE.length).toBeGreaterThan(50);
  });
});
