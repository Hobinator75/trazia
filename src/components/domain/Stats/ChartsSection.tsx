import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Text, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import { useResolvedScheme } from '@/hooks/useResolvedScheme';
import { computeModePieData, type ModePieKey } from '@/lib/stats';
import { colors, modeColors, paletteFor } from '@/theme/colors';

const yearOf = (iso: string): number => Number.parseInt(iso.slice(0, 4), 10);
const monthOf = (iso: string): number => Number.parseInt(iso.slice(5, 7), 10);

export interface ChartsSectionProps {
  journeys: JourneyWithRefs[];
}

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mx-4 my-3 rounded-3xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-5">
      <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

export function ChartsSection({ journeys }: ChartsSectionProps) {
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const palette = paletteFor(scheme);
  const screenWidth = Dimensions.get('window').width - 16 * 2 - 20 * 2;

  const modeLabels: Record<ModePieKey, string> = {
    flight: t('achievements_section.mode_label_flight'),
    train: t('achievements_section.mode_label_train'),
    car: t('achievements_section.mode_label_car'),
    ship: t('achievements_section.mode_label_ship'),
    other: t('achievements_section.mode_label_other'),
  };

  const yearBarData = useMemo(() => {
    const counts = new Map<number, number>();
    for (const j of journeys) counts.set(yearOf(j.date), (counts.get(yearOf(j.date)) ?? 0) + 1);
    const sortedYears = [...counts.keys()]
      .sort((a, b) => b - a)
      .slice(0, 5)
      .reverse();
    return sortedYears.map((year) => ({
      value: counts.get(year) ?? 0,
      label: String(year).slice(2),
      frontColor: colors.primary,
      topLabelComponent: () => (
        <Text style={{ color: palette.text, fontSize: 10 }}>{counts.get(year) ?? 0}</Text>
      ),
    }));
  }, [journeys, palette.text]);

  const modePieData = useMemo(() => {
    const slices = computeModePieData(journeys);
    if (slices === null) return null;
    return slices.map((s) => ({
      value: s.value,
      color: modeColors[s.key],
      text: modeLabels[s.key],
    }));
    // modeLabels is recomputed each render but the result is stable per
    // locale; the dep below is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys, modeLabels.flight, modeLabels.train, modeLabels.car, modeLabels.ship, modeLabels.other]);

  const monthlyDistanceData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const buckets: number[] = Array.from({ length: 12 }, () => 0);
    for (const j of journeys) {
      if (yearOf(j.date) !== currentYear) continue;
      const m = monthOf(j.date);
      if (m >= 1 && m <= 12) {
        buckets[m - 1] = (buckets[m - 1] ?? 0) + (j.distanceKm ?? 0);
      }
    }
    const labels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    return buckets.map((value, idx) => ({
      value: Math.round(value),
      label: labels[idx] ?? '',
      dataPointColor: colors.secondary,
    }));
  }, [journeys]);

  const yearTotal = yearBarData.reduce((sum, b) => sum + b.value, 0);
  const monthlyTotal = monthlyDistanceData.reduce((sum, d) => sum + d.value, 0);
  const flightLabel = modeLabels.flight;

  return (
    <View>
      <CardShell title={t('achievements_section.card_year_title')}>
        {yearTotal === 0 ? (
          <Text className="text-sm text-text-muted-light dark:text-text-muted">
            {t('stats.charts_no_data')}
          </Text>
        ) : (
          <BarChart
            data={yearBarData}
            barWidth={28}
            barBorderRadius={6}
            height={160}
            xAxisLabelTextStyle={{ color: palette.textMuted }}
            yAxisTextStyle={{ color: palette.textMuted }}
            xAxisColor={palette.border}
            yAxisColor={palette.border}
            noOfSections={4}
            isAnimated
          />
        )}
      </CardShell>

      <CardShell title={t('achievements_section.card_modes_title')}>
        {modePieData === null ? (
          <Text className="text-sm text-text-muted-light dark:text-text-muted">
            {t('achievements_section.no_journeys')}
          </Text>
        ) : modePieData.length === 1 && modePieData[0]?.text === flightLabel ? (
          // Phase-1: most users will only have flights — a single-slice
          // donut looks broken. Show a plain statement instead.
          <Text className="text-sm text-text-dark dark:text-text-light">
            {t('achievements_section.modes_flight_only')}
          </Text>
        ) : (
          <View className="flex-row items-center gap-4">
            <PieChart data={modePieData} radius={80} donut innerRadius={48} />
            <View className="flex-1 gap-1">
              {modePieData.map((d) => (
                <View key={d.text} className="flex-row items-center gap-2">
                  <View
                    style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color }}
                  />
                  <Text className="text-sm text-text-dark dark:text-text-light">{d.text}</Text>
                  <Text className="ml-auto text-xs text-text-muted-light dark:text-text-muted">
                    {d.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <Text className="mt-3 text-xs text-text-muted-light dark:text-text-muted">
          {t('achievements_section.modes_more')}
        </Text>
      </CardShell>

      <CardShell title={t('achievements_section.card_monthly_title')}>
        {monthlyTotal === 0 ? (
          <Text className="text-sm text-text-muted-light dark:text-text-muted">
            {t('achievements_section.no_year')}
          </Text>
        ) : (
          <LineChart
            data={monthlyDistanceData}
            width={screenWidth}
            thickness={2}
            color={colors.secondary}
            curved
            xAxisLabelTextStyle={{ color: palette.textMuted }}
            yAxisTextStyle={{ color: palette.textMuted }}
            xAxisColor={palette.border}
            yAxisColor={palette.border}
            hideRules
            isAnimated
            initialSpacing={12}
          />
        )}
      </CardShell>
    </View>
  );
}
