import { Text, View } from 'react-native';

import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { RotatingMiniGlobe } from '@/components/ui/RotatingMiniGlobe';
import { EARTH_CIRCUMFERENCE_KM, type Stats } from '@/lib/stats';
import { colors } from '@/theme/colors';

export interface HeroCardProps {
  stats: Stats;
}

export function HeroCard({ stats }: HeroCardProps) {
  const rotations = stats.earthRotations;
  const nextMilestone = Math.max(1, Math.ceil(rotations + 0.001));
  const progressTowardsNext = Math.min(1, rotations / nextMilestone);
  const remainingKm = Math.max(0, nextMilestone * EARTH_CIRCUMFERENCE_KM - stats.totalKm);

  return (
    <View className="mx-4 my-3 overflow-hidden rounded-3xl border border-border-dark bg-surface-dark">
      <View className="flex-row items-center gap-4 px-5 py-5">
        <RotatingMiniGlobe size={72} />
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Erde umrundet
          </Text>
          <View className="flex-row items-baseline gap-1">
            <AnimatedCounter
              value={rotations}
              format={(n) => n.toFixed(2)}
              className="text-4xl font-bold"
              style={{ color: colors.text.light }}
            />
            <Text className="text-base text-text-muted">×</Text>
          </View>
          <Text className="text-xs text-text-muted">
            {Math.round(stats.totalKm).toLocaleString('de-DE')} km insgesamt
          </Text>
        </View>
      </View>
      <View className="px-5 pb-5">
        <View className="h-2 overflow-hidden rounded-full bg-background-dark">
          <View className="h-full bg-primary" style={{ width: `${progressTowardsNext * 100}%` }} />
        </View>
        <Text className="mt-2 text-xs text-text-muted">
          Noch {Math.round(remainingKm).toLocaleString('de-DE')} km bis zu {nextMilestone}{' '}
          Erdumrundungen
        </Text>
      </View>
    </View>
  );
}
