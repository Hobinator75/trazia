import { useMemo } from 'react';
import { Dimensions, Text, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import { colors, modeColors } from '@/theme/colors';

const yearOf = (iso: string): number => Number.parseInt(iso.slice(0, 4), 10);
const monthOf = (iso: string): number => Number.parseInt(iso.slice(5, 7), 10);

export interface ChartsSectionProps {
  journeys: JourneyWithRefs[];
}

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mx-4 my-3 rounded-3xl border border-border-dark bg-surface-dark p-5">
      <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

export function ChartsSection({ journeys }: ChartsSectionProps) {
  const screenWidth = Dimensions.get('window').width - 16 * 2 - 20 * 2;

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
        <Text style={{ color: colors.text.light, fontSize: 10 }}>{counts.get(year) ?? 0}</Text>
      ),
    }));
  }, [journeys]);

  const modePieData = useMemo(() => {
    const counts = { flight: 0, train: 0, car: 0, ship: 0, other: 0 };
    for (const j of journeys) {
      const key =
        j.mode === 'flight' || j.mode === 'train' || j.mode === 'car' || j.mode === 'ship'
          ? j.mode
          : 'other';
      counts[key] += 1;
    }
    const total = counts.flight + counts.train + counts.car + counts.ship + counts.other;
    if (total === 0) return null;
    return [
      { value: counts.flight, color: modeColors.flight, text: 'Flug' },
      { value: counts.train, color: modeColors.train, text: 'Zug' },
      { value: counts.car, color: modeColors.car, text: 'Auto' },
      { value: counts.ship, color: modeColors.ship, text: 'Schiff' },
      { value: counts.other, color: modeColors.other, text: 'Sonstiges' },
    ].filter((d) => d.value > 0);
  }, [journeys]);

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

  return (
    <View>
      <CardShell title="Reisen pro Jahr">
        {yearTotal === 0 ? (
          <Text className="text-sm text-text-muted">Noch keine Daten.</Text>
        ) : (
          <BarChart
            data={yearBarData}
            barWidth={28}
            barBorderRadius={6}
            height={160}
            xAxisLabelTextStyle={{ color: colors.text.muted }}
            yAxisTextStyle={{ color: colors.text.muted }}
            xAxisColor={colors.border.dark}
            yAxisColor={colors.border.dark}
            noOfSections={4}
            isAnimated
          />
        )}
      </CardShell>

      <CardShell title="Modi-Verteilung">
        {modePieData ? (
          <View className="flex-row items-center gap-4">
            <PieChart data={modePieData} radius={80} donut innerRadius={48} />
            <View className="flex-1 gap-1">
              {modePieData.map((d) => (
                <View key={d.text} className="flex-row items-center gap-2">
                  <View
                    style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color }}
                  />
                  <Text className="text-sm text-text-light">{d.text}</Text>
                  <Text className="ml-auto text-xs text-text-muted">{d.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text className="text-sm text-text-muted">Noch keine Reisen.</Text>
        )}
        <Text className="mt-3 text-xs text-text-muted">Mehr Modi kommen bald!</Text>
      </CardShell>

      <CardShell title="Distanz pro Monat (laufendes Jahr)">
        {monthlyTotal === 0 ? (
          <Text className="text-sm text-text-muted">Noch keine Reisen in diesem Jahr.</Text>
        ) : (
          <LineChart
            data={monthlyDistanceData}
            width={screenWidth}
            thickness={2}
            color={colors.secondary}
            curved
            xAxisLabelTextStyle={{ color: colors.text.muted }}
            yAxisTextStyle={{ color: colors.text.muted }}
            xAxisColor={colors.border.dark}
            yAxisColor={colors.border.dark}
            hideRules
            isAnimated
            initialSpacing={12}
          />
        )}
      </CardShell>
    </View>
  );
}
