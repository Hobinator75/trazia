import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AchievementsSection } from '@/components/domain/Stats/AchievementsSection';
import { ChartsSection } from '@/components/domain/Stats/ChartsSection';
import { HeroCard } from '@/components/domain/Stats/HeroCard';
import { MoonProgressCard } from '@/components/domain/Stats/MoonProgressCard';
import { QuickNumbersGrid } from '@/components/domain/Stats/QuickNumbersGrid';
import { TopRoutesCard } from '@/components/domain/Stats/TopRoutesCard';
import { YearInReviewTeaser } from '@/components/domain/Stats/YearInReviewTeaser';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useStatsData } from '@/hooks/useStatsData';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { stats, journeys, refs, unlockedIds, unlockedAtById, loading } = useStatsData();

  if (loading && journeys.length === 0) {
    return <LoadingScreen subtitle="Statistik wird berechnet…" />;
  }

  return (
    <ScrollView
      className="flex-1 bg-background-dark"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}
    >
      <View className="mb-2 px-4">
        <Text className="text-3xl font-bold tracking-tight text-text-light">Statistik</Text>
      </View>

      {journeys.length === 0 ? (
        <EmptyState
          icon="stats-chart-outline"
          title="Noch keine Daten"
          subtitle="Sobald du deine erste Reise erfasst, taucht hier alles auf."
        />
      ) : (
        <>
          <HeroCard stats={stats} />
          <QuickNumbersGrid stats={stats} />
          <MoonProgressCard stats={stats} />
          <TopRoutesCard journeys={journeys} />
          <ChartsSection journeys={journeys} />
          <YearInReviewTeaser journeys={journeys} refs={refs} />
        </>
      )}

      <AchievementsSection unlockedIds={unlockedIds} unlockedAtById={unlockedAtById} />
    </ScrollView>
  );
}
