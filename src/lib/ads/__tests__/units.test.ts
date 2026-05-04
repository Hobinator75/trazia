import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// react-native isn't available in vitest's node environment; mock just
// the shape we touch (Platform.OS).
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const ENV_KEY = 'EXPO_PUBLIC_ENV';
let snapshot: string | undefined;

describe('AdMob unit selection', () => {
  beforeEach(() => {
    snapshot = process.env[ENV_KEY];
    delete process.env[ENV_KEY];
    vi.resetModules();
  });

  afterEach(() => {
    if (snapshot === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = snapshot;
    }
  });

  it('falls back to Google test units in dev/preview builds', async () => {
    const mod = await import('../units');
    expect(mod.adUnits.banner).toMatch(/^ca-app-pub-3940256099942544/);
    expect(mod.adUnits.native).toMatch(/^ca-app-pub-3940256099942544/);
    expect(mod.adUnits.interstitial).toMatch(/^ca-app-pub-3940256099942544/);
    expect(mod.adUnits.rewarded).toMatch(/^ca-app-pub-3940256099942544/);
    expect(mod.isUsingTestUnits).toBe(true);
  });

  it('uses real production unit IDs when EXPO_PUBLIC_ENV=production', async () => {
    process.env[ENV_KEY] = 'production';
    const mod = await import('../units');
    expect(mod.adUnits.native).toBe('ca-app-pub-6316860881127013/5488275799');
    expect(mod.adUnits.interstitial).toBe('ca-app-pub-6316860881127013/6284376351');
    expect(mod.adUnits.rewarded).toBe('ca-app-pub-6316860881127013/4971294683');
    expect(mod.isUsingTestUnits).toBe(false);
  });

  it('exposes banner and appOpen as null in production (slots not rendered)', async () => {
    process.env[ENV_KEY] = 'production';
    const mod = await import('../units');
    expect(mod.adUnits.banner).toBeNull();
    expect(mod.adUnits.appOpen).toBeNull();
  });

  it('exports the frequency-cap config used by controllers', async () => {
    const mod = await import('../units');
    expect(mod.adFrequency.interstitialEveryNthInsert).toBe(5);
    expect(mod.adFrequency.interstitialMinIntervalMs).toBe(90 * 1000);
    expect(mod.adFrequency.nativeEveryNthRow).toBe(10);
    expect(mod.adFrequency.newInstallGraceMs).toBe(60 * 1000);
    expect(mod.adFrequency.rewardedTrialDays).toBe(7);
    expect(mod.adFrequency.rewardedTrialItem).toBe('Trazia Pro days');
    expect(mod.adFrequency.rewardedTrialAntiAbuseWindowMs).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
