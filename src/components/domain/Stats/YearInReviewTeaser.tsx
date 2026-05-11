import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import { formatInt } from '@/lib/i18n/formatNumber';
import { statsByYear } from '@/lib/stats';
import { colors } from '@/theme/colors';

export interface YearInReviewTeaserProps {
  journeys: JourneyWithRefs[];
  refs?: Parameters<typeof statsByYear>[2];
}

export function YearInReviewTeaser({ journeys, refs }: YearInReviewTeaserProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const year = new Date().getFullYear();
  const stats = statsByYear(journeys, year, refs);
  const totalJourneys =
    stats.flightCount + stats.trainCount + stats.carCount + stats.shipCount + stats.otherCount;

  return (
    <Pressable
      onPress={() => router.push('/stats/year-in-review')}
      className="mx-4 my-3 overflow-hidden rounded-3xl border border-primary/40 bg-surface-light dark:bg-surface-dark active:opacity-80"
    >
      <View className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/15" />
      <View className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-secondary/15" />
      <View className="px-5 py-5">
        <Text className="text-xs font-semibold uppercase tracking-wider text-primary">
          {t('stats.year_in_review')}
        </Text>
        <Text className="mt-1 text-2xl font-bold text-text-dark dark:text-text-light">
          {t('stats.year_review_my_year', { year })}
        </Text>
        <Text className="mt-1 text-sm text-text-muted-light dark:text-text-muted">
          {t('stats.year_review_summary', {
            count: totalJourneys,
            km: formatInt(stats.totalKm, i18n.language),
            countries: stats.countriesVisited,
          })}
        </Text>
        <View className="mt-4 flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-primary">{t('stats.year_review_open')}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}
