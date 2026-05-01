import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStatsData } from '@/hooks/useStatsData';
import { statsByMonth, statsByYear, topOperators, topRoutes } from '@/lib/stats';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

export default function YearInReviewScreen() {
  const insets = useSafeAreaInsets();
  const { journeys, refs, loading } = useStatsData();
  const year = new Date().getFullYear();

  if (loading && journeys.length === 0) {
    return <LoadingScreen subtitle="Jahresrückblick wird gebaut…" />;
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
    return bestIdx > 0 ? { month: MONTH_NAMES[bestIdx - 1] ?? '', km: bestKm } : null;
  })();

  const totalJourneys =
    stats.flightCount + stats.trainCount + stats.carCount + stats.shipCount + stats.otherCount;

  return (
    <ScrollView
      className="flex-1 bg-background-dark"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 16,
      }}
    >
      <Text className="text-xs font-semibold uppercase tracking-widest text-primary">
        Jahresrückblick
      </Text>
      <Text className="text-4xl font-bold text-text-light">Dein Jahr {year}</Text>

      <View className="mt-6 rounded-3xl border border-border-dark bg-surface-dark p-5">
        <Text className="text-xs uppercase tracking-wider text-text-muted">Reisen</Text>
        <Text className="text-4xl font-bold text-text-light">{totalJourneys}</Text>
        <Text className="text-xs text-text-muted">quer durch {stats.countriesVisited} Länder</Text>
      </View>

      <View className="mt-3 rounded-3xl border border-border-dark bg-surface-dark p-5">
        <Text className="text-xs uppercase tracking-wider text-text-muted">Distanz</Text>
        <Text className="text-4xl font-bold text-text-light">
          {Math.round(stats.totalKm).toLocaleString('de-DE')} km
        </Text>
        <Text className="text-xs text-text-muted">
          ≈ {stats.earthRotations.toFixed(2)} × Erdumrundung
        </Text>
      </View>

      {busiestMonth ? (
        <View className="mt-3 rounded-3xl border border-border-dark bg-surface-dark p-5">
          <Text className="text-xs uppercase tracking-wider text-text-muted">Aktivster Monat</Text>
          <Text className="text-4xl font-bold text-text-light">{busiestMonth.month}</Text>
          <Text className="text-xs text-text-muted">
            {Math.round(busiestMonth.km).toLocaleString('de-DE')} km zurückgelegt
          </Text>
        </View>
      ) : null}

      {routes.length > 0 ? (
        <View className="mt-3 rounded-3xl border border-border-dark bg-surface-dark p-5">
          <Text className="text-xs uppercase tracking-wider text-text-muted">Lieblings-Routen</Text>
          {routes.map((r) => (
            <Text key={`${r.from}-${r.to}`} className="mt-2 text-base text-text-light">
              {r.from} → {r.to} · {r.count}×
            </Text>
          ))}
        </View>
      ) : null}

      {operators.length > 0 ? (
        <View className="mt-3 rounded-3xl border border-border-dark bg-surface-dark p-5">
          <Text className="text-xs uppercase tracking-wider text-text-muted">Top Operators</Text>
          {operators.map((o) => (
            <Text key={o.operator} className="mt-2 text-base text-text-light">
              {o.operator} · {o.count} Reisen · {Math.round(o.totalKm).toLocaleString('de-DE')} km
            </Text>
          ))}
        </View>
      ) : null}

      <Text className="mt-6 px-2 text-center text-xs text-text-muted">
        Storyfied Premium-Wrapped mit Animationen kommt in CC-3.8.
      </Text>
    </ScrollView>
  );
}
