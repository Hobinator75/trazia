import { isAdFreeNow } from '@/stores/premiumStore';

import { configureAds } from './index';
import { adUnits } from './units';

const COOLDOWN_MS = 5 * 60 * 1000;
const TRIGGER_EVERY = 5;

let createdSinceLastInterstitial = 0;
let totalCreated = 0;
let lastShownAt = 0;
let preloaded: { show: () => void } | null = null;

async function preloadInterstitial(): Promise<void> {
  if (preloaded) return;
  if (!adUnits.interstitial) return;
  const { available } = await configureAds();
  if (!available) return;
  try {
    const sdk = await import('react-native-google-mobile-ads');
    const ad = sdk.InterstitialAd.createForAdRequest(adUnits.interstitial);
    await new Promise<void>((resolve, reject) => {
      const off = ad.addAdEventsListener((event) => {
        if (event.type === sdk.AdEventType.LOADED) {
          off?.();
          resolve();
        } else if (event.type === sdk.AdEventType.ERROR) {
          off?.();
          reject(event.payload);
        }
      });
      ad.load();
    });
    preloaded = {
      show: () => {
        ad.show().catch(() => undefined);
        preloaded = null;
        // Kick off the next preload so the next eligible journey has an ad ready.
        void preloadInterstitial();
      },
    };
  } catch {
    preloaded = null;
  }
}

export interface JourneyCreatedOptions {
  // Forces the first-run exemption — usually inferred from the controller's
  // own counter, but the caller can opt in explicitly (e.g. onboarding's
  // sample-journey insert).
  isFirstRun?: boolean;
}

// Called by createJourney() after a successful insert. The first journey of
// a fresh app session is always exempt (user spec: "NICHT beim First-Run");
// subsequent journeys count toward the next-interstitial trigger every
// TRIGGER_EVERY successful creates, gated additionally by COOLDOWN_MS and
// the user's ad-free state.
export async function onJourneyCreated(opts: JourneyCreatedOptions = {}): Promise<void> {
  totalCreated += 1;
  if (opts.isFirstRun || totalCreated === 1) return;
  if (isAdFreeNow()) return;

  createdSinceLastInterstitial += 1;
  if (createdSinceLastInterstitial < TRIGGER_EVERY) {
    if (createdSinceLastInterstitial === TRIGGER_EVERY - 1) {
      void preloadInterstitial();
    }
    return;
  }

  const now = Date.now();
  if (now - lastShownAt < COOLDOWN_MS) return;
  if (!preloaded) {
    await preloadInterstitial();
  }
  if (!preloaded) return;

  lastShownAt = now;
  createdSinceLastInterstitial = 0;
  preloaded.show();
}

export const __interstitialDebug = (): {
  total: number;
  pendingForNext: number;
  cooldownRemainingMs: number;
} => ({
  total: totalCreated,
  pendingForNext: TRIGGER_EVERY - createdSinceLastInterstitial,
  cooldownRemainingMs: Math.max(0, COOLDOWN_MS - (Date.now() - lastShownAt)),
});
