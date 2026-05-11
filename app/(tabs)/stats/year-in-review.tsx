import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useIsPremium } from '@/hooks/useIsPremium';
import { useStatsData } from '@/hooks/useStatsData';
import { formatFloat, formatInt } from '@/lib/i18n/formatNumber';
import { statsByMonth, statsByYear, topOperators, topRoutes } from '@/lib/stats';
import { colors } from '@/theme/colors';

const MONTH_KEYS = [
  'months.january',
  'months.february',
  'months.march',
  'months.april',
  'months.may',
  'months.june',
  'months.july',
  'months.august',
  'months.september',
  'months.october',
  'months.november',
  'months.december',
];

export default function YearInReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { journeys, refs, loading } = useStatsData();
  const { isPremium } = useIsPremium();
  const year = new Date().getFullYear();

  if (loading && journeys.length === 0) {
    return <LoadingScreen subtitle={t('stats.year_loading')} />;
  }

  const stats = statsByYear(journeys, year, refs);
  const months = statsByMonth(journeys, year, refs);
  const routes = topRoutes(
    journeys.filter((j) => j.date.startsWith(String(year))),
    3,
  );
  const operators = topOperators(
    journeys.filter((j) => j.date.startsWith(String(year))),
    3,
    refs,
  );

  const busiestMonth = (() => {
    let bestIdx = -1;
    let bestKm = -1;
    for (let m = 1; m <= 12; m++) {
      const km = months[m]?.totalKm ?? 0;
      if (km > bestKm) {
        bestKm = km;
        bestIdx = m;
      }
    }
    return bestIdx > 0
      ? { monthLabel: t(MONTH_KEYS[bestIdx - 1] ?? 'months.january'), km: bestKm }
      : null;
  })();

  const totalJourneys =
    stats.flightCount + stats.trainCount + stats.carCount + stats.shipCount + stats.otherCount;

  return (
    <ScrollView
      className="flex-1 bg-background-light dark:bg-background-dark"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 16,
      }}
    >
      <Text className="text-xs font-semibold uppercase tracking-widest text-primary">
        {t('stats.year_in_review')}
      </Text>
      <Text className="text-4xl font-bold text-text-dark dark:text-text-light">
        {t('stats.year_review_my_year', { year })}
      </Text>

      <View className="mt-6 rounded-3xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-5">
        <Text className="text-xs uppercase tracking-wider text-text-muted-light dark:text-text-muted">
          {t('stats.year_journeys_label')}
        </Text>
        <Text className="text-4xl font-bold text-text-dark dark:text-text-light">
          {totalJourneys}
        </Text>
        <Text className="text-xs text-text-muted-light dark:text-text-muted">
          {t('stats.year_through_countries', { count: stats.countriesVisited })}
        </Text>
      </View>

      <View className="mt-3 rounded-3xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-5">
        <Text className="text-xs uppercase tracking-wider text-text-muted-light dark:text-text-muted">
          {t('stats.year_distance_label')}
        </Text>
        <Text className="text-4xl font-bold text-text-dark dark:text-text-light">
          {formatInt(stats.totalKm, i18n.language)} km
        </Text>
        <Text className="text-xs text-text-muted-light dark:text-text-muted">
          {t('stats.year_earth_laps', {
            count: formatFloat(stats.earthRotations, i18n.language, 2),
          })}
        </Text>
      </View>

      {isPremium ? (
        <>
          {busiestMonth ? (
            <View className="mt-3 rounded-3xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-5">
              <Text className="text-xs uppercase tracking-wider text-text-muted-light dark:text-text-muted">
                {t('stats.year_busiest')}
              </Text>
              <Text className="text-4xl font-bold text-text-dark dark:text-text-light">
                {busiestMonth.monthLabel}
              </Text>
              <Text className="text-xs text-text-muted-light dark:text-text-muted">
                {t('stats.year_busiest_km', { km: formatInt(busiestMonth.km, i18n.language) })}
              </Text>
            </View>
          ) : null}

          {routes.length > 0 ? (
            <View className="mt-3 rounded-3xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-5">
              <Text className="text-xs uppercase tracking-wider text-text-muted-light dark:text-text-muted">
                {t('stats.year_top_routes')}
              </Text>
              {routes.map((r) => (
                <Text
                  key={`${r.from}-${r.to}`}
                  className="mt-2 text-base text-text-dark dark:text-text-light"
                >
                  {r.from} → {r.to} · {r.count}×
                </Text>
              ))}
            </View>
          ) : null}

          {operators.length > 0 ? (
            <View className="mt-3 rounded-3xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-5">
              <Text className="text-xs uppercase tracking-wider text-text-muted-light dark:text-text-muted">
                {t('stats.year_top_operators')}
              </Text>
              {operators.map((o) => (
                <Text
                  key={o.operator}
                  className="mt-2 text-base text-text-dark dark:text-text-light"
                >
                  {t('stats.year_operator_line', {
                    operator: o.operator,
                    count: o.count,
                    km: formatInt(o.totalKm, i18n.language),
                  })}
                </Text>
              ))}
            </View>
          ) : null}

          <Text className="mt-6 px-2 text-center text-xs text-text-muted-light dark:text-text-muted">
            {t('stats.year_wrapped_note')}
          </Text>
        </>
      ) : (
        <View className="mt-3 rounded-3xl border border-primary/40 bg-primary/10 p-5">
          <View className="mb-2 flex-row items-center gap-2">
            <Ionicons name="lock-closed" size={16} color={colors.primary} />
            <Text className="text-xs font-semibold uppercase tracking-wider text-primary">
              {t('stats.year_premium_kicker')}
            </Text>
          </View>
          <Text className="text-base text-text-dark dark:text-text-light">
            {t('stats.year_premium_body')}
          </Text>
          <Pressable
            onPress={() => router.push('/profile/premium')}
            className="mt-4 items-center rounded-full bg-primary py-3 active:opacity-80"
          >
            <Text className="text-sm font-semibold text-white">
              {t('stats.year_premium_cta')}
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
