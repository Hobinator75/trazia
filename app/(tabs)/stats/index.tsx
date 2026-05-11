import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdaptiveBannerAd } from '@/components/domain/AdaptiveBannerAd';
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
  const { t } = useTranslation();
  const { stats, journeys, refs, unlockedIds, unlockedAtById, loading } = useStatsData();

  if (loading && journeys.length === 0) {
    return <LoadingScreen subtitle={t('stats.loading')} />;
  }

  return (
    <ScrollView
      className="flex-1 bg-background-light dark:bg-background-dark"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}
    >
      <View className="mb-2 px-4">
        <Text className="text-3xl font-bold tracking-tight text-text-dark dark:text-text-light">
          {t('stats.title')}
        </Text>
      </View>

      {journeys.length === 0 ? (
        <EmptyState
          icon="stats-chart-outline"
          title={t('stats.empty_title')}
          subtitle={t('stats.empty_subtitle')}
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

      <View className="px-2 pt-2">
        <AdaptiveBannerAd />
      </View>
    </ScrollView>
  );
}
