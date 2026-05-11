import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { RotatingMiniGlobe } from '@/components/ui/RotatingMiniGlobe';
import { useResolvedScheme } from '@/hooks/useResolvedScheme';
import { formatInt } from '@/lib/i18n/formatNumber';
import { EARTH_CIRCUMFERENCE_KM, type Stats } from '@/lib/stats';
import { paletteFor } from '@/theme/colors';

export interface HeroCardProps {
  stats: Stats;
}

export function HeroCard({ stats }: HeroCardProps) {
  const { t, i18n } = useTranslation();
  const scheme = useResolvedScheme();
  const palette = paletteFor(scheme);
  const rotations = stats.earthRotations;
  const nextMilestone = Math.max(1, Math.ceil(rotations + 0.001));
  const progressTowardsNext = Math.min(1, rotations / nextMilestone);
  const remainingKm = Math.max(0, nextMilestone * EARTH_CIRCUMFERENCE_KM - stats.totalKm);

  return (
    <View className="mx-4 my-3 overflow-hidden rounded-3xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
      <View className="flex-row items-center gap-4 px-5 py-5">
        <RotatingMiniGlobe size={72} />
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
            {t('stats.hero_label')}
          </Text>
          <View className="flex-row items-baseline gap-1">
            <AnimatedCounter
              value={rotations}
              format={(n) => n.toFixed(2)}
              className="text-4xl font-bold"
              style={{ color: palette.text }}
            />
            <Text className="text-base text-text-muted-light dark:text-text-muted">×</Text>
          </View>
          <Text className="text-xs text-text-muted-light dark:text-text-muted">
            {t('stats.hero_km_total', { km: formatInt(stats.totalKm, i18n.language) })}
          </Text>
        </View>
      </View>
      <View className="px-5 pb-5">
        <View className="h-2 overflow-hidden rounded-full bg-background-light dark:bg-background-dark">
          <View className="h-full bg-primary" style={{ width: `${progressTowardsNext * 100}%` }} />
        </View>
        <Text className="mt-2 text-xs text-text-muted-light dark:text-text-muted">
          {t('stats.hero_remaining', {
            km: formatInt(remainingKm, i18n.language),
            count: nextMilestone,
          })}
        </Text>
      </View>
    </View>
  );
}
