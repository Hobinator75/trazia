import { configureAds } from './index';
import { adUnits } from './units';

export type RewardedOutcome =
  | { kind: 'rewarded'; amount: number; type: string }
  | { kind: 'cancelled' }
  | { kind: 'unavailable' };

// Loads + shows a rewarded video. Resolves once the ad is closed (or never
// loaded). Caller is expected to gate on the user not yet being premium.
// The reward payload (amount/type) flows through so the caller can decide
// what to grant — Trazia maps reward "type" to a 7-day Pro trial.
export async function showRewardedAd(): Promise<RewardedOutcome> {
  if (!adUnits.rewarded) return { kind: 'unavailable' };
  const { available } = await configureAds();
  if (!available) return { kind: 'unavailable' };
  let sdk: typeof import('react-native-google-mobile-ads');
  try {
    sdk = await import('react-native-google-mobile-ads');
  } catch {
    return { kind: 'unavailable' };
  }

  const ad = sdk.RewardedAd.createForAdRequest(adUnits.rewarded);

  return new Promise<RewardedOutcome>((resolve) => {
    let earned: { amount: number; type: string } | null = null;
    let settled = false;
    const settle = (value: RewardedOutcome): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const off = ad.addAdEventsListener((event) => {
      if (event.type === sdk.RewardedAdEventType.EARNED_REWARD) {
        const payload = event.payload as { amount?: number; type?: string } | undefined;
        earned = {
          amount: typeof payload?.amount === 'number' ? payload.amount : 0,
          type: typeof payload?.type === 'string' ? payload.type : '',
        };
      }
      if (event.type === sdk.AdEventType.ERROR) {
        off?.();
        settle({ kind: 'unavailable' });
      }
      if (event.type === sdk.AdEventType.CLOSED) {
        off?.();
        settle(earned ? { kind: 'rewarded', ...earned } : { kind: 'cancelled' });
      }
      if (event.type === sdk.AdEventType.LOADED) {
        ad.show().catch(() => settle({ kind: 'unavailable' }));
      }
    });
    try {
      ad.load();
    } catch {
      settle({ kind: 'unavailable' });
    }
  });
}
