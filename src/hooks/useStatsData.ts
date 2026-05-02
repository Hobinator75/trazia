import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { db } from '@/db/client';
import { listJourneysWithRefs, type JourneyWithRefs } from '@/db/repositories/journey.repository';
import { achievementUnlocks, locations, operators } from '@/db/schema';
import { aggregateStatsMemo, type Stats, type StatsRefs } from '@/lib/stats';
import { useAchievementStore } from '@/stores/achievementStore';

export interface StatsData {
  journeys: JourneyWithRefs[];
  stats: Stats;
  refs: StatsRefs;
  unlockedIds: Set<string>;
  unlockedAtById: Map<string, Date | null>;
  triggeringJourneyById: Map<string, string | null>;
  loading: boolean;
  reload: () => Promise<void>;
}

export function useStatsData(): StatsData {
  const [journeys, setJourneys] = useState<JourneyWithRefs[]>([]);
  const [refs, setRefs] = useState<StatsRefs>({});
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [unlockedAtById, setUnlockedAtById] = useState<Map<string, Date | null>>(new Map());
  const [triggeringJourneyById, setTriggeringJourneyById] = useState<Map<string, string | null>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [allJourneys, allLocations, allOperators, allUnlocks] = await Promise.all([
        listJourneysWithRefs(db),
        db.select().from(locations),
        db.select().from(operators),
        db.select().from(achievementUnlocks),
      ]);
      setJourneys(allJourneys);
      setRefs({
        locationsById: new Map(allLocations.map((l) => [l.id, { id: l.id, country: l.country }])),
        operatorsById: new Map(allOperators.map((o) => [o.id, { id: o.id, name: o.name }])),
      });
      const ids = new Set<string>();
      const unlockedAt = new Map<string, Date | null>();
      const triggering = new Map<string, string | null>();
      for (const u of allUnlocks) {
        ids.add(u.achievementId);
        unlockedAt.set(u.achievementId, u.unlockedAt ?? null);
        triggering.set(u.achievementId, u.triggeringJourneyId ?? null);
      }
      setUnlockedIds(ids);
      setUnlockedAtById(unlockedAt);
      setTriggeringJourneyById(triggering);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  useEffect(() => {
    const unsub = useAchievementStore.getState().addListener(() => {
      void reload();
    });
    return unsub;
  }, [reload]);

  // Reference-equality memoised; keeps recomputation out of focus events
  // when journeys/refs haven't changed (which is most refocus events).
  const stats = useMemo(() => aggregateStatsMemo(journeys, refs), [journeys, refs]);

  return {
    journeys,
    stats,
    refs,
    unlockedIds,
    unlockedAtById,
    triggeringJourneyById,
    loading,
    reload,
  };
}
