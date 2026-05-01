import { create } from 'zustand';

export interface PremiumState {
  // True iff the user holds an active premium entitlement, OR a temporary
  // ad-free window from a rewarded video (those don't unlock premium-only
  // features but they do silence ads — see isAdFree()).
  isPremium: boolean;
  // Epoch ms; if in the future, ads are suppressed even for free users.
  adFreeUntil: number | null;
  // True when the IAP layer hasn't completed its first sync yet. The UI
  // should treat this as "not premium" (safe default) but can show a
  // subtle pending indicator on the paywall instead of zero offerings.
  hydrating: boolean;
  setIsPremium: (value: boolean) => void;
  setAdFreeUntil: (epochMs: number | null) => void;
  setHydrating: (value: boolean) => void;
}

export const usePremiumStore = create<PremiumState>((set) => ({
  isPremium: false,
  adFreeUntil: null,
  hydrating: true,
  setIsPremium: (value) => set({ isPremium: value }),
  setAdFreeUntil: (adFreeUntil) => set({ adFreeUntil }),
  setHydrating: (value) => set({ hydrating: value }),
}));

export const isAdFreeNow = (): boolean => {
  const { isPremium, adFreeUntil } = usePremiumStore.getState();
  if (isPremium) return true;
  return adFreeUntil !== null && adFreeUntil > Date.now();
};
