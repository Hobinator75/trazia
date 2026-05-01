import { useEffect, useState } from 'react';

import { getOfferings } from '@/lib/iap';
import type { OfferingsView } from '@/lib/iap/types';

export interface UseOfferingsState {
  offerings: OfferingsView;
  loading: boolean;
  error: Error | undefined;
  reload: () => Promise<void>;
}

export function useOfferings(): UseOfferingsState {
  const [offerings, setOfferings] = useState<OfferingsView>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  const reload = async (): Promise<void> => {
    setLoading(true);
    try {
      const view = await getOfferings();
      setOfferings(view);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return { offerings, loading, error, reload };
}
