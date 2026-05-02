import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import type { Stats } from '@/lib/stats';
import { colors } from '@/theme/colors';

// Quick numbers are display-only for now. The Stat-Drilldown screen
// (app/(tabs)/stats/stat/[key].tsx) is a placeholder until CC-3.6 lands;
// making the tiles tappable would lead nowhere. Re-introduce onTilePress +
// router.push when the drilldown ships.

export interface QuickNumbersGridProps {
  stats: Stats;
}

interface TileSpec {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
}

function buildTiles(stats: Stats): TileSpec[] {
  const totalJourneys =
    stats.flightCount + stats.trainCount + stats.carCount + stats.shipCount + stats.otherCount;
  const hours = Math.round(stats.totalDurationMinutes / 60);
  return [
    {
      key: 'journeys',
      label: 'Reisen',
      icon: 'compass-outline',
      value: totalJourneys.toLocaleString('de-DE'),
    },
    {
      key: 'countries',
      label: 'Länder',
      icon: 'flag-outline',
      value: stats.countriesVisited.toLocaleString('de-DE'),
    },
    {
      key: 'hours',
      label: 'Stunden unterwegs',
      icon: 'time-outline',
      value: hours.toLocaleString('de-DE'),
    },
    {
      key: 'operators',
      label: 'Operators',
      icon: 'business-outline',
      value: stats.operatorCount.toLocaleString('de-DE'),
    },
    {
      key: 'locations',
      label: 'Orte',
      icon: 'location-outline',
      value: stats.locationCount.toLocaleString('de-DE'),
    },
    {
      key: 'vehicles',
      label: 'Fahrzeuge',
      icon: 'airplane-outline',
      value: stats.vehicleCount.toLocaleString('de-DE'),
    },
  ];
}

export function QuickNumbersGrid({ stats }: QuickNumbersGridProps) {
  const tiles = buildTiles(stats);
  return (
    <View className="mx-4 my-3 flex-row flex-wrap" style={{ gap: 12 }}>
      {tiles.map((tile) => (
        <View
          key={tile.key}
          className="rounded-2xl border border-border-dark bg-surface-dark p-4"
          style={{ width: '31%' }}
        >
          <Ionicons name={tile.icon} size={18} color={colors.text.muted} />
          <Text className="mt-2 text-2xl font-bold text-text-light" numberOfLines={1}>
            {tile.value}
          </Text>
          <Text className="text-xs text-text-muted" numberOfLines={1}>
            {tile.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
