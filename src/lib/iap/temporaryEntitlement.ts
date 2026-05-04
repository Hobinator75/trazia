import AsyncStorage from '@react-native-async-storage/async-storage';

import { adFrequency } from '@/lib/ads/units';

const STORAGE_KEY = 'trazia.temp-pro-entitlement';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface TemporaryEntitlement {
  expiresAt: number;
  grantedAt: number;
  source: string;
  deviceId: string;
}

export interface AntiAbuseStatus {
  allowed: boolean;
  // Epoch ms; null when no prior grant exists.
  nextEligibleAt: number | null;
}

const isShape = (value: unknown): value is TemporaryEntitlement => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.expiresAt === 'number' &&
    typeof v.grantedAt === 'number' &&
    typeof v.source === 'string' &&
    typeof v.deviceId === 'string'
  );
};

// Lazy-loaded so vitest's Node environment doesn't choke on the native
// binding. Falls back to a stable random ID on platforms where
// expo-application can't resolve a vendor/Android ID — that ID still lets
// the anti-abuse window work for a single device + install pair.
async function resolveDeviceId(): Promise<string> {
  try {
    const mod = await import('expo-application');
    const ios = (mod as unknown as { getIosIdForVendorAsync?: () => Promise<string | null> })
      .getIosIdForVendorAsync;
    const android = (mod as unknown as { getAndroidId?: () => string | null }).getAndroidId;
    const value = ios ? await ios() : android ? android() : null;
    if (value && value.length > 0) return value;
  } catch {
    // expo-application not available in vitest / Expo Go fallback.
  }
  const fallbackKey = 'trazia.temp-pro-entitlement.fallback-device-id';
  const cached = await AsyncStorage.getItem(fallbackKey);
  if (cached) return cached;
  const generated = `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(fallbackKey, generated);
  return generated;
}

export async function getDeviceId(): Promise<string> {
  return resolveDeviceId();
}

export async function getTemporaryEntitlement(): Promise<TemporaryEntitlement | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearTemporaryEntitlement(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function isTemporaryEntitlementValid(now: number = Date.now()): Promise<boolean> {
  const entitlement = await getTemporaryEntitlement();
  if (!entitlement) return false;
  return entitlement.expiresAt > now;
}

// Anti-abuse: at most one rewarded trial per device per
// `adFrequency.rewardedTrialAntiAbuseWindowMs` (30 days). The window is
// measured from the most recent grant's `grantedAt`, so a user who burns
// through a 7-day trial still has to wait the remaining 23 days before
// they can earn another.
export async function canGrantRewardedTrial(
  now: number = Date.now(),
  windowMs: number = adFrequency.rewardedTrialAntiAbuseWindowMs,
): Promise<AntiAbuseStatus> {
  const existing = await getTemporaryEntitlement();
  if (!existing) return { allowed: true, nextEligibleAt: null };
  const nextEligibleAt = existing.grantedAt + windowMs;
  return {
    allowed: now >= nextEligibleAt,
    nextEligibleAt,
  };
}

export interface GrantResult {
  granted: boolean;
  reason?: 'anti_abuse';
  entitlement?: TemporaryEntitlement;
  nextEligibleAt?: number | null;
}

// Grants a temporary Pro entitlement persisted to AsyncStorage. Returns
// `granted: false, reason: 'anti_abuse'` when the caller should refuse —
// kept as a soft fail so the UI can show a "come back in N days" toast
// instead of throwing.
export async function grantTemporaryProEntitlement(
  days: number,
  source: string,
  now: number = Date.now(),
): Promise<GrantResult> {
  const status = await canGrantRewardedTrial(now);
  if (!status.allowed) {
    return { granted: false, reason: 'anti_abuse', nextEligibleAt: status.nextEligibleAt };
  }
  const deviceId = await resolveDeviceId();
  const entitlement: TemporaryEntitlement = {
    expiresAt: now + days * DAY_MS,
    grantedAt: now,
    source,
    deviceId,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entitlement));
  return { granted: true, entitlement };
}

export const TEMPORARY_ENTITLEMENT_STORAGE_KEY = STORAGE_KEY;
