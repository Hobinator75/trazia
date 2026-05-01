import { useEffect } from 'react';

import { configureIap } from '@/lib/iap';
import { isAdFreeNow, usePremiumStore } from '@/stores/premiumStore';

let configurePromise: Promise<void> | null = null;

const ensureConfigured = (): Promise<void> => {
  if (!configurePromise) configurePromise = configureIap();
  return configurePromise;
};

export interface PremiumState {
  isPremium: boolean;
  isAdFree: boolean;
  hydrating: boolean;
}

export function useIsPremium(): PremiumState {
  const isPremium = usePremiumStore((s) => s.isPremium);
  const adFreeUntil = usePremiumStore((s) => s.adFreeUntil);
  const hydrating = usePremiumStore((s) => s.hydrating);

  useEffect(() => {
    void ensureConfigured();
  }, []);

  return {
    isPremium,
    isAdFree: isPremium || (adFreeUntil !== null && adFreeUntil > Date.now()),
    hydrating,
  };
}

export { isAdFreeNow };
