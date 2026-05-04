import { create } from 'zustand';

export interface PremiumState {
  // Active RevenueCat subscription. Source of truth for "paid Pro".
  isPremium: boolean;
  // Local 7-day Pro trial earned via rewarded ad. When the timestamp is in
  // the future the user gets the full Pro feature set (ads silenced, cloud
  // sync writable, etc.) — the subscription path remains the canonical
  // entitlement, but `isProActive` ORs both sources.
  proTrialUntil: number | null;
  // True when the IAP layer hasn't completed its first sync yet. The UI
  // should treat this as "not premium" (safe default) but can show a
  // subtle pending indicator on the paywall instead of zero offerings.
  hydrating: boolean;
  setIsPremium: (value: boolean) => void;
  setProTrialUntil: (epochMs: number | null) => void;
  setHydrating: (value: boolean) => void;
}

export const usePremiumStore = create<PremiumState>((set) => ({
  isPremium: false,
  proTrialUntil: null,
  hydrating: true,
  setIsPremium: (value) => set({ isPremium: value }),
  setProTrialUntil: (proTrialUntil) => set({ proTrialUntil }),
  setHydrating: (value) => set({ hydrating: value }),
}));

const trialActive = (proTrialUntil: number | null, now: number = Date.now()): boolean =>
  proTrialUntil !== null && proTrialUntil > now;

export const isProActive = (now: number = Date.now()): boolean => {
  const { isPremium, proTrialUntil } = usePremiumStore.getState();
  return isPremium || trialActive(proTrialUntil, now);
};

export const isAdFreeNow = (now: number = Date.now()): boolean => isProActive(now);
