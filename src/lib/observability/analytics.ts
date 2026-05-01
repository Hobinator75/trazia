import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSettingsStore } from '@/stores/settings.store';

import type { TransportMode } from '@/types/domain-types';

type PostHogModule = typeof import('posthog-react-native');
type PostHogInstance = InstanceType<PostHogModule['default']>;

const ANON_ID_KEY = 'analytics.anonymousId';
const APP_OPENED_LAST_DAY_KEY = 'analytics.lastAppOpenedDay';

let cachedClient: PostHogInstance | null = null;
let configurePromise: Promise<PostHogInstance | null> | null = null;

const apiKey = (): string | undefined => process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = (): string => process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com';

async function loadPostHog(): Promise<PostHogModule | null> {
  try {
    return await import('posthog-react-native');
  } catch {
    return null;
  }
}

async function ensureAnonId(): Promise<string> {
  const existing = await AsyncStorage.getItem(ANON_ID_KEY);
  if (existing) return existing;
  const id = `anon_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
  await AsyncStorage.setItem(ANON_ID_KEY, id);
  return id;
}

async function getClient(): Promise<PostHogInstance | null> {
  if (cachedClient) return cachedClient;
  if (configurePromise) return configurePromise;
  const key = apiKey();
  if (!key) return null;

  configurePromise = (async () => {
    const mod = await loadPostHog();
    if (!mod) return null;
    const PostHog = mod.default;
    const anonId = await ensureAnonId();
    const client = new PostHog(key, {
      host: host(),
      flushAt: 20,
      flushInterval: 30_000,
      captureAppLifecycleEvents: false,
      // We feed our own anonymous identifier; this also disables PostHog's
      // default device-vendor based identifier collection.
      preloadFeatureFlags: false,
    });
    client.identify(anonId);
    cachedClient = client;
    return client;
  })();
  return configurePromise;
}

const isAllowed = (): boolean => useSettingsStore.getState().analyticsEnabled;

export async function captureEvent(
  event: string,
  properties: Record<string, string | number | boolean | undefined> = {},
): Promise<void> {
  if (!isAllowed()) return;
  const client = await getClient();
  if (!client) {
    if (__DEV__) console.log('[analytics stub]', event, properties);
    return;
  }
  // Filter out undefined values — PostHog accepts them but it pollutes the
  // schema in the ingest pipeline.
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(properties)) {
    if (v !== undefined) clean[k] = v;
  }
  client.capture(event, clean);
}

// app_opened fires at most once per calendar day so the metric isn't dominated
// by hot-reload churn during development.
export async function trackAppOpened(): Promise<void> {
  if (!isAllowed()) return;
  const today = new Date().toISOString().slice(0, 10);
  const last = await AsyncStorage.getItem(APP_OPENED_LAST_DAY_KEY);
  if (last === today) return;
  await AsyncStorage.setItem(APP_OPENED_LAST_DAY_KEY, today);
  await captureEvent('app_opened', { day: today });
}

export const trackJourneyAdded = (mode: TransportMode | string): Promise<void> =>
  captureEvent('journey_added', { mode });

export const trackAchievementUnlocked = (achievementId: string): Promise<void> =>
  captureEvent('achievement_unlocked', { achievement_id: achievementId });

export const trackPaywallShown = (source: string): Promise<void> =>
  captureEvent('paywall_shown', { source });

export const trackPaywallPurchased = (productId: string): Promise<void> =>
  captureEvent('paywall_purchased', { product_id: productId });

export const trackModeLockedTapped = (mode: string): Promise<void> =>
  captureEvent('mode_locked_tapped', { mode });

// Test-only: clears cached client + anon id so the next call re-initialises.
export async function __resetAnalyticsForTesting(): Promise<void> {
  cachedClient = null;
  configurePromise = null;
  await AsyncStorage.removeItem(ANON_ID_KEY);
}
