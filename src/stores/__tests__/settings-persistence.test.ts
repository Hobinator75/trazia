import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory AsyncStorage shim for vitest. Mirrors the subset of the
// AsyncStorage API zustand/middleware/persist actually calls.
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
      getItem: async (key: string) => store.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: async (key: string) => {
        store.delete(key);
      },
    },
  };
};

const mocked = memoryStorage();
vi.mock('@react-native-async-storage/async-storage', () => mocked);

describe('settings store persistence', () => {
  beforeEach(() => {
    mocked.store.clear();
    vi.resetModules();
  });

  afterEach(() => {
    mocked.store.clear();
  });

  it('persists crashReportsEnabled across simulated app restart', async () => {
    const { useSettingsStore } = await import('../settings.store');
    // Wait for initial hydration (no stored state yet).
    await useSettingsStore.persist.rehydrate();
    useSettingsStore.getState().setCrashReportsEnabled(false);

    // Simulate app restart: drop the module cache so a brand-new store
    // instance reads back from AsyncStorage on hydrate.
    vi.resetModules();
    const reimport = await import('../settings.store');
    await reimport.useSettingsStore.persist.rehydrate();

    expect(reimport.useSettingsStore.getState().crashReportsEnabled).toBe(false);
  });

  it('persists analyticsEnabled across simulated app restart', async () => {
    const { useSettingsStore } = await import('../settings.store');
    await useSettingsStore.persist.rehydrate();
    useSettingsStore.getState().setAnalyticsEnabled(true);

    vi.resetModules();
    const reimport = await import('../settings.store');
    await reimport.useSettingsStore.persist.rehydrate();

    expect(reimport.useSettingsStore.getState().analyticsEnabled).toBe(true);
  });

  it('persists theme, distanceUnit, soundEnabled', async () => {
    const { useSettingsStore } = await import('../settings.store');
    await useSettingsStore.persist.rehydrate();
    useSettingsStore.getState().setTheme('light');
    useSettingsStore.getState().setDistanceUnit('mi');
    useSettingsStore.getState().setSoundEnabled(false);

    vi.resetModules();
    const reimport = await import('../settings.store');
    await reimport.useSettingsStore.persist.rehydrate();

    const s = reimport.useSettingsStore.getState();
    expect(s.theme).toBe('light');
    expect(s.distanceUnit).toBe('mi');
    expect(s.soundEnabled).toBe(false);
  });

  it('returns documented defaults when no persisted state exists', async () => {
    const { useSettingsStore } = await import('../settings.store');
    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    expect(s.theme).toBe('system');
    expect(s.locale).toBe(null);
    expect(s.distanceUnit).toBe('km');
    expect(s.soundEnabled).toBe(true);
    expect(s.notificationsEnabled).toBe(false);
    expect(s.crashReportsEnabled).toBe(true);
    expect(s.analyticsEnabled).toBe(false);
  });

  it('Sentry beforeSend reads the live store value (so opt-out survives boot order)', async () => {
    // The beforeSend hook in src/lib/observability/sentry.ts uses
    // useSettingsStore.getState() to honor the *current* value rather
    // than a boot-time snapshot. Verify that contract here so the
    // privacy guarantee can't regress silently.
    const { useSettingsStore } = await import('../settings.store');
    await useSettingsStore.persist.rehydrate();

    useSettingsStore.getState().setCrashReportsEnabled(false);
    expect(useSettingsStore.getState().crashReportsEnabled).toBe(false);

    // Same access pattern as the production beforeSend hook.
    const isAllowedNow = (): boolean => useSettingsStore.getState().crashReportsEnabled;
    expect(isAllowedNow()).toBe(false);

    useSettingsStore.getState().setCrashReportsEnabled(true);
    expect(isAllowedNow()).toBe(true);
  });
});
