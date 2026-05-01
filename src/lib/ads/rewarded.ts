import { configureAds } from './index';
import { adUnits } from './units';

export type RewardedResult = 'rewarded' | 'cancelled' | 'unavailable';

// Loads + shows a rewarded video. Resolves once the ad is closed (or never
// loaded). Caller is expected to gate on the user not yet being premium.
export async function showRewardedAd(): Promise<RewardedResult> {
  const { available } = await configureAds();
  if (!available) return 'unavailable';
  let sdk: typeof import('react-native-google-mobile-ads');
  try {
    sdk = await import('react-native-google-mobile-ads');
  } catch {
    return 'unavailable';
  }

  const ad = sdk.RewardedAd.createForAdRequest(adUnits.rewarded);

  return new Promise<RewardedResult>((resolve) => {
    let earned = false;
    let settled = false;
    const settle = (value: RewardedResult): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const off = ad.addAdEventsListener((event) => {
      if (event.type === sdk.RewardedAdEventType.EARNED_REWARD) {
        earned = true;
      }
      if (event.type === sdk.AdEventType.ERROR) {
        off?.();
        settle('unavailable');
      }
      if (event.type === sdk.AdEventType.CLOSED) {
        off?.();
        settle(earned ? 'rewarded' : 'cancelled');
      }
      if (event.type === sdk.AdEventType.LOADED) {
        ad.show().catch(() => settle('unavailable'));
      }
    });
    try {
      ad.load();
    } catch {
      settle('unavailable');
    }
  });
}
