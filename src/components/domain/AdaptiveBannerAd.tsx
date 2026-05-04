import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useIsPremium } from '@/hooks/useIsPremium';
import { configureAds } from '@/lib/ads';
import { adUnits } from '@/lib/ads/units';

type GMA = typeof import('react-native-google-mobile-ads');

export interface AdaptiveBannerAdProps {
  // Slot-style fallback height so the layout doesn't jump while the ad
  // module is still loading. Tuned to roughly match anchored adaptive
  // banners on phone widths.
  reservedHeight?: number;
}

export function AdaptiveBannerAd({ reservedHeight = 56 }: AdaptiveBannerAdProps) {
  const { isAdFree } = useIsPremium();
  const [sdk, setSdk] = useState<GMA | null>(null);

  useEffect(() => {
    if (isAdFree) return;
    let cancelled = false;
    (async () => {
      const { available } = await configureAds();
      if (!available) return;
      try {
        const mod = await import('react-native-google-mobile-ads');
        if (!cancelled) setSdk(mod);
      } catch {
        // Native module missing — keep silent.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdFree]);

  if (isAdFree) return null;
  // Production builds explicitly opt out of banner ads (adUnits.banner is
  // null on prod). Render nothing instead of crashing the SDK.
  if (adUnits.banner === null) return null;
  if (!sdk) return <View style={{ height: reservedHeight }} />;

  const { BannerAd, BannerAdSize } = sdk;
  return (
    <View style={{ alignItems: 'center', backgroundColor: 'transparent' }}>
      <BannerAd unitId={adUnits.banner} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
