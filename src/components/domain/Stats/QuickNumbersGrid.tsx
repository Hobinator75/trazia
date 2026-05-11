import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { formatInt } from '@/lib/i18n/formatNumber';
import type { Stats } from '@/lib/stats';
import { colors } from '@/theme/colors';

// Quick numbers are display-only for now. The Stat-Drilldown screen
// (app/(tabs)/stats/stat/[key].tsx) is a placeholder until the drilldown
// flow ships; making the tiles tappable would lead nowhere. Re-introduce
// onTilePress + router.push when the drilldown lands.

export interface QuickNumbersGridProps {
  stats: Stats;
}

interface TileSpec {
  key: string;
  labelKey: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: number;
}

function buildTiles(stats: Stats): TileSpec[] {
  const totalJourneys =
    stats.flightCount + stats.trainCount + stats.carCount + stats.shipCount + stats.otherCount;
  const hours = Math.round(stats.totalDurationMinutes / 60);
  return [
    { key: 'journeys', labelKey: 'stats.tile_journeys', icon: 'compass-outline', value: totalJourneys },
    { key: 'countries', labelKey: 'stats.tile_countries', icon: 'flag-outline', value: stats.countriesVisited },
    { key: 'hours', labelKey: 'stats.tile_hours', icon: 'time-outline', value: hours },
    { key: 'operators', labelKey: 'stats.tile_operators', icon: 'business-outline', value: stats.operatorCount },
    { key: 'locations', labelKey: 'stats.tile_locations', icon: 'location-outline', value: stats.locationCount },
    { key: 'vehicles', labelKey: 'stats.tile_vehicles', icon: 'airplane-outline', value: stats.vehicleCount },
  ];
}

export function QuickNumbersGrid({ stats }: QuickNumbersGridProps) {
  const { t, i18n } = useTranslation();
  const tiles = buildTiles(stats);
  return (
    <View className="mx-4 my-3 flex-row flex-wrap" style={{ gap: 12 }}>
      {tiles.map((tile) => (
        <View
          key={tile.key}
          className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4"
          style={{ width: '31%' }}
        >
          <Ionicons name={tile.icon} size={18} color={colors.text.muted} />
          <Text
            className="mt-2 text-2xl font-bold text-text-dark dark:text-text-light"
            numberOfLines={1}
          >
            {formatInt(tile.value, i18n.language)}
          </Text>
          <Text
            className="text-xs text-text-muted-light dark:text-text-muted"
            numberOfLines={1}
          >
            {t(tile.labelKey)}
          </Text>
        </View>
      ))}
    </View>
  );
}
