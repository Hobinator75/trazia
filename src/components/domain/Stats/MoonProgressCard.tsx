import { Text, View } from 'react-native';

import { EARTH_TO_MOON_KM, type Stats } from '@/lib/stats';
import { colors } from '@/theme/colors';

export interface MoonProgressCardProps {
  stats: Stats;
}

export function MoonProgressCard({ stats }: MoonProgressCardProps) {
  const progress = Math.max(0, Math.min(1, stats.moonProgress));
  const remainingKm = Math.max(0, EARTH_TO_MOON_KM - stats.totalKm);

  return (
    <View className="mx-4 my-3 rounded-3xl border border-border-dark bg-surface-dark p-5">
      <View className="flex-row items-center gap-4">
        <View
          className="h-14 w-14 overflow-hidden rounded-full border border-border-dark"
          style={{ backgroundColor: '#1E1E2E' }}
        >
          <View
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: `${progress * 100}%`,
              backgroundColor: '#FBBF24',
            }}
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Distanz zum Mond
          </Text>
          <Text className="text-2xl font-bold text-text-light">
            {Math.round(stats.totalKm).toLocaleString('de-DE')} km
          </Text>
          <Text className="text-xs text-text-muted">
            von {EARTH_TO_MOON_KM.toLocaleString('de-DE')} km · noch{' '}
            {Math.round(remainingKm).toLocaleString('de-DE')} km
          </Text>
        </View>
      </View>
      <View className="mt-4 h-2 overflow-hidden rounded-full bg-background-dark">
        <View
          className="h-full"
          style={{
            width: `${Math.min(100, progress * 100)}%`,
            backgroundColor: colors.warning,
          }}
        />
      </View>
    </View>
  );
}
