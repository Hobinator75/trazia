import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { db } from '@/db/client';
import { type JourneyWithRefs, listJourneysWithRefs } from '@/db/repositories/journey.repository';
import { useAchievementStore } from '@/stores/achievementStore';

export interface UseJourneysState {
  journeys: JourneyWithRefs[];
  loading: boolean;
  error: Error | undefined;
  reload: () => Promise<void>;
}

export function useJourneys(): UseJourneysState {
  const [journeys, setJourneys] = useState<JourneyWithRefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listJourneysWithRefs(db);
      setJourneys(rows);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // Achievement unlocks happen post-mutation; refresh so the count badge etc.
  // stays in sync without forcing screens to opt in.
  useEffect(() => {
    const unsub = useAchievementStore.getState().addListener(() => {
      void reload();
    });
    return unsub;
  }, [reload]);

  return { journeys, loading, error, reload };
}
