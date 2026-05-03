import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { db } from '@/db/client';
import { loadFromSeedDbAsset } from '@/db/seed/loadFromSeedDbAsset';
import { seedFromStatic, type SeedResult } from '@/db/seed/seedFromStatic';

export interface UseDbSeedState {
  success: boolean;
  error: Error | undefined;
  result: SeedResult | undefined;
}

// Cold-start order:
//   1) loadFromSeedDbAsset — copies the pre-built `trazia-seed.db` rows
//      into the live DB via ATTACH + INSERT. ~5–15× faster than the JSON
//      path on mid-range devices because it's one SQL transfer instead of
//      ~4700 individual INSERT statements.
//   2) seedFromStatic — JSON-based fallback. Only fires if (1) throws
//      (e.g. asset missing in a hot-fix build, broken file, OS-level
//      copy/attach refusal). Keeps the app launchable in any state.
export function useDbSeed(enabled: boolean = true): UseDbSeedState {
  const [state, setState] = useState<UseDbSeedState>({
    success: false,
    error: undefined,
    result: undefined,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const run = async () => {
      try {
        const fast = await loadFromSeedDbAsset({ db, storage: AsyncStorage });
        const result: SeedResult = {
          inserted: fast.loaded,
          reason: fast.reason,
          counts: fast.counts,
        };
        if (!cancelled) setState({ success: true, error: undefined, result });
      } catch (fastError) {
        try {
          const slow = await seedFromStatic({ db, storage: AsyncStorage });
          if (!cancelled) {
            setState({ success: true, error: undefined, result: slow });
          }
        } catch (slowError) {
          const error =
            slowError instanceof Error ? slowError : new Error(String(slowError ?? fastError));
          if (!cancelled) {
            setState({ success: false, error, result: undefined });
          }
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
