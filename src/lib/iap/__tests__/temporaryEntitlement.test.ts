import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory AsyncStorage shim. Matches the persist-store test pattern so
// the trial entitlement and the fallback device-id share a single store.
const memoryStorage = (): {
  store: Map<string, string>;
  default: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  };
} => {
  const store = new Map<string, string>();
  return {
    store,
    default: {
      getItem: async (key) => store.get(key) ?? null,
      setItem: async (key, value) => {
        store.set(key, value);
      },
      removeItem: async (key) => {
        store.delete(key);
      },
    },
  };
};

const mocked = memoryStorage();
vi.mock('@react-native-async-storage/async-storage', () => mocked);
vi.mock('expo-application', () => ({
  getIosIdForVendorAsync: async () => 'test-ios-vendor-id',
  getAndroidId: () => 'test-android-id',
}));
// react-native isn't available in vitest's Node environment; the units
// module imports Platform.OS to pick the right test/prod ID set.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const DAY = 24 * 60 * 60 * 1000;

describe('temporary Pro entitlement', () => {
  beforeEach(() => {
    mocked.store.clear();
    vi.resetModules();
  });

  afterEach(() => {
    mocked.store.clear();
  });

  it('grants a 7-day entitlement and persists it to AsyncStorage', async () => {
    const mod = await import('../temporaryEntitlement');
    const t0 = 1_700_000_000_000;
    const result = await mod.grantTemporaryProEntitlement(7, 'rewarded_ad', t0);

    expect(result.granted).toBe(true);
    expect(result.entitlement).toMatchObject({
      expiresAt: t0 + 7 * DAY,
      grantedAt: t0,
      source: 'rewarded_ad',
    });

    const persisted = mocked.store.get(mod.TEMPORARY_ENTITLEMENT_STORAGE_KEY);
    expect(persisted).toBeTruthy();
    expect(JSON.parse(persisted as string)).toMatchObject({ source: 'rewarded_ad' });
  });

  it('reports the entitlement as valid mid-trial and expired on day 8', async () => {
    const mod = await import('../temporaryEntitlement');
    const t0 = 1_700_000_000_000;
    await mod.grantTemporaryProEntitlement(7, 'rewarded_ad', t0);

    expect(await mod.isTemporaryEntitlementValid(t0 + 3 * DAY)).toBe(true);
    expect(await mod.isTemporaryEntitlementValid(t0 + 7 * DAY - 1)).toBe(true);
    expect(await mod.isTemporaryEntitlementValid(t0 + 7 * DAY + 1)).toBe(false);
    expect(await mod.isTemporaryEntitlementValid(t0 + 8 * DAY)).toBe(false);
  });

  it('blocks a second grant within the 30-day anti-abuse window', async () => {
    const mod = await import('../temporaryEntitlement');
    const t0 = 1_700_000_000_000;
    await mod.grantTemporaryProEntitlement(7, 'rewarded_ad', t0);

    // Day 8 — entitlement has expired but the anti-abuse window is still active.
    const onDay8 = await mod.canGrantRewardedTrial(t0 + 8 * DAY);
    expect(onDay8.allowed).toBe(false);
    expect(onDay8.nextEligibleAt).toBe(t0 + 30 * DAY);

    const blocked = await mod.grantTemporaryProEntitlement(7, 'rewarded_ad', t0 + 8 * DAY);
    expect(blocked.granted).toBe(false);
    expect(blocked.reason).toBe('anti_abuse');
  });

  it('allows a fresh grant once the 30-day window has elapsed', async () => {
    const mod = await import('../temporaryEntitlement');
    const t0 = 1_700_000_000_000;
    await mod.grantTemporaryProEntitlement(7, 'rewarded_ad', t0);

    const onDay30 = await mod.canGrantRewardedTrial(t0 + 30 * DAY);
    expect(onDay30.allowed).toBe(true);

    const second = await mod.grantTemporaryProEntitlement(7, 'rewarded_ad', t0 + 30 * DAY);
    expect(second.granted).toBe(true);
    expect(second.entitlement?.grantedAt).toBe(t0 + 30 * DAY);
  });

  it('clears the persisted entitlement when requested', async () => {
    const mod = await import('../temporaryEntitlement');
    const t0 = 1_700_000_000_000;
    await mod.grantTemporaryProEntitlement(7, 'rewarded_ad', t0);
    await mod.clearTemporaryEntitlement();
    expect(await mod.getTemporaryEntitlement()).toBeNull();
  });
});

describe('Pro status: subscription overrides trial', () => {
  beforeEach(() => {
    mocked.store.clear();
    vi.resetModules();
  });

  it('reports isProActive=true when a subscription is active, even without a trial', async () => {
    const { usePremiumStore, isProActive } = await import('@/stores/premiumStore');
    usePremiumStore.getState().setIsPremium(true);
    usePremiumStore.getState().setProTrialUntil(null);
    expect(isProActive()).toBe(true);
  });

  it('reports isProActive=true when only the trial is active', async () => {
    const { usePremiumStore, isProActive } = await import('@/stores/premiumStore');
    usePremiumStore.getState().setIsPremium(false);
    const t0 = 1_700_000_000_000;
    usePremiumStore.getState().setProTrialUntil(t0 + 3 * DAY);
    expect(isProActive(t0)).toBe(true);
    // Past trial expiry, only the subscription would keep Pro alive.
    expect(isProActive(t0 + 4 * DAY)).toBe(false);
  });

  it('reports isProActive=true when both sources overlap (sub takes precedence)', async () => {
    const { usePremiumStore, isProActive } = await import('@/stores/premiumStore');
    const t0 = 1_700_000_000_000;
    usePremiumStore.getState().setIsPremium(true);
    usePremiumStore.getState().setProTrialUntil(t0 + 3 * DAY);
    expect(isProActive(t0)).toBe(true);
    // Even after the trial expires the sub keeps Pro active.
    expect(isProActive(t0 + 4 * DAY)).toBe(true);
  });
});
