import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { useIsPremium } from './useIsPremium';

const UPSELL_25_KEY = 'upsell.25_journeys_shown';
const THRESHOLD = 25;

export interface JourneyCountUpsellState {
  visible: boolean;
  dismiss: () => void;
}

// Triggers a one-time, soft upsell after the user crosses 25 logged
// journeys. The "shown" flag is persisted to AsyncStorage so it never
// re-fires on subsequent launches even if the user dismisses without
// upgrading. Premium users are exempt; the trigger no-ops for them.
export function useJourneyCountUpsell(journeyCount: number): JourneyCountUpsellState {
  const { isPremium } = useIsPremium();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isPremium) return;
    if (journeyCount < THRESHOLD) return;
    let cancelled = false;
    (async () => {
      const flag = await AsyncStorage.getItem(UPSELL_25_KEY);
      if (cancelled || flag === 'true') return;
      setVisible(true);
      await AsyncStorage.setItem(UPSELL_25_KEY, 'true');
    })();
    return () => {
      cancelled = true;
    };
  }, [journeyCount, isPremium]);

  return {
    visible,
    dismiss: () => setVisible(false),
  };
}
