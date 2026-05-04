import { useEffect } from 'react';

import { configureIap } from '@/lib/iap';
import { getTemporaryEntitlement } from '@/lib/iap/temporaryEntitlement';
import { isAdFreeNow, isProActive, usePremiumStore } from '@/stores/premiumStore';

let configurePromise: Promise<void> | null = null;

const ensureConfigured = (): Promise<void> => {
  if (!configurePromise) {
    configurePromise = (async () => {
      await configureIap();
      // Hydrate the rewarded-trial entitlement once per process. The
      // store's `proTrialUntil` is the canonical "is the local trial
      // running?" signal — we don't poll, the timestamp self-expires.
      const entitlement = await getTemporaryEntitlement();
      usePremiumStore
        .getState()
        .setProTrialUntil(
          entitlement && entitlement.expiresAt > Date.now() ? entitlement.expiresAt : null,
        );
    })();
  }
  return configurePromise;
};

export interface PremiumState {
  isPremium: boolean;
  isAdFree: boolean;
  hydrating: boolean;
  // True if Pro is active via subscription OR an unexpired rewarded trial.
  isProActive: boolean;
  // Trial-only signal so the UI can show "Pro-Trial endet in 3 d 4 h".
  proTrialUntil: number | null;
}

export function useIsPremium(): PremiumState {
  const isPremium = usePremiumStore((s) => s.isPremium);
  const proTrialUntil = usePremiumStore((s) => s.proTrialUntil);
  const hydrating = usePremiumStore((s) => s.hydrating);

  useEffect(() => {
    void ensureConfigured();
  }, []);

  const trialActive = proTrialUntil !== null && proTrialUntil > Date.now();
  return {
    isPremium,
    isAdFree: isPremium || trialActive,
    hydrating,
    isProActive: isPremium || trialActive,
    proTrialUntil,
  };
}

export { isAdFreeNow, isProActive };
