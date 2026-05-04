import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// react-native isn't available in vitest's node environment; mock just
// the shape we touch (Platform.OS).
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const ENV_KEYS = [
  'EXPO_PUBLIC_ENV',
  'EXPO_PUBLIC_ADMOB_BANNER_ANDROID',
  'EXPO_PUBLIC_ADMOB_BANNER_IOS',
  'EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID',
  'EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS',
  'EXPO_PUBLIC_ADMOB_REWARDED_ANDROID',
  'EXPO_PUBLIC_ADMOB_REWARDED_IOS',
];

const snapshot: Record<string, string | undefined> = {};

describe('AdMob unit selection', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      snapshot[key] = process.env[key];
      delete process.env[key];
    }
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const previous = snapshot[key];
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
  });

  it('falls back to Google test unit IDs when no env vars are set in dev', async () => {
    const mod = await import('../units');
    expect(mod.adUnits.banner).toMatch(/^ca-app-pub-3940256099942544/);
    expect(mod.isUsingTestUnits).toBe(true);
  });

  it('uses configured iOS banner unit ID when provided', async () => {
    process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS = 'ca-app-pub-1234567890123456/9999999999';
    const mod = await import('../units');
    expect(mod.adUnits.banner).toBe('ca-app-pub-1234567890123456/9999999999');
  });

  it('hard-fails at module load when EXPO_PUBLIC_ENV=production has no real unit IDs', async () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    await expect(import('../units')).rejects.toThrow(/Production build requires real AdMob/);
  });

  it('accepts all real unit IDs in production', async () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS = 'ca-app-pub-1111111111111111/1';
    process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID = 'ca-app-pub-1111111111111111/2';
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS = 'ca-app-pub-1111111111111111/3';
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID = 'ca-app-pub-1111111111111111/4';
    process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS = 'ca-app-pub-1111111111111111/5';
    process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID = 'ca-app-pub-1111111111111111/6';
    const mod = await import('../units');
    expect(mod.adUnits.banner).toBe('ca-app-pub-1111111111111111/1');
    expect(mod.adUnits.interstitial).toBe('ca-app-pub-1111111111111111/3');
    expect(mod.adUnits.rewarded).toBe('ca-app-pub-1111111111111111/5');
  });
});
