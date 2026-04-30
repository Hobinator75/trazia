import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { db } from '@/db/client';
import { seedFromStatic, type SeedResult } from '@/db/seed/seedFromStatic';

export interface UseDbSeedState {
  success: boolean;
  error: Error | undefined;
  result: SeedResult | undefined;
}

export function useDbSeed(enabled: boolean = true): UseDbSeedState {
  const [state, setState] = useState<UseDbSeedState>({
    success: false,
    error: undefined,
    result: undefined,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    seedFromStatic({ db, storage: AsyncStorage })
      .then((result) => {
        if (!cancelled) {
          setState({ success: true, error: undefined, result });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            result: undefined,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
