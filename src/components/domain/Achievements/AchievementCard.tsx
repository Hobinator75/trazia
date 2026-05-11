import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import { getLocalizedAchievement } from '@/lib/achievements/localize';
import { tierStyle } from '@/lib/achievements/tier';
import type { Achievement } from '@/lib/achievements/types';
import { colors } from '@/theme/colors';

export interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt: Date | null;
  onPress: () => void;
}

const formatUnlockDate = (date: Date | null): string => {
  if (!date) return '';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' });
};

export function AchievementCard({
  achievement,
  unlocked,
  unlockedAt,
  onPress,
}: AchievementCardProps) {
  const tier = tierStyle(achievement.tier);
  const isHidden = achievement.hidden && !unlocked;
  const isPremium = !!achievement.premium;
  const localized = getLocalizedAchievement(achievement);

  if (isHidden) {
    return (
      <View
        className="rounded-2xl border border-border-dark bg-surface-dark/60 p-3"
        style={{ aspectRatio: 0.85 }}
      >
        <View className="flex-1 items-center justify-center">
          <Ionicons name="help-circle-outline" size={28} color={colors.text.muted} />
          <Text className="mt-2 text-base font-bold text-text-muted">???</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isPremium && !unlocked}
      className="overflow-hidden rounded-2xl border active:opacity-80"
      style={{
        aspectRatio: 0.85,
        borderColor: unlocked ? tier.primary : colors.border.dark,
        backgroundColor: unlocked ? `${tier.primary}1A` : colors.surface.dark,
        opacity: unlocked ? 1 : isPremium ? 0.6 : 0.55,
      }}
    >
      {unlocked && tier.isGradient ? (
        <LinearGradient
          colors={[`${tier.primary}33`, `${tier.secondary}33`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
        />
      ) : null}
      <View className="flex-1 items-center justify-center px-2 py-3">
        <View
          className="h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: unlocked ? `${tier.primary}33` : `${colors.text.muted}1A`,
          }}
        >
          {unlocked ? (
            <Text className="text-2xl">{tier.badge}</Text>
          ) : isPremium ? (
            <Ionicons name="star" size={22} color={colors.warning} />
          ) : (
            <Ionicons name="lock-closed" size={20} color={colors.text.muted} />
          )}
        </View>
        <Text
          className="mt-2 text-center text-xs font-semibold"
          numberOfLines={2}
          style={{ color: unlocked ? colors.text.light : colors.text.muted }}
        >
          {localized.title}
        </Text>
        {unlocked ? (
          unlockedAt ? (
            <Text className="mt-1 text-[10px] text-text-muted">{formatUnlockDate(unlockedAt)}</Text>
          ) : null
        ) : (
          <Text
            className="mt-1 px-1 text-center text-[10px] text-text-muted"
            numberOfLines={2}
            style={{ opacity: 0.5 }}
          >
            {localized.description}
          </Text>
        )}
        {isPremium && !unlocked ? (
          <Text className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-warning">
            Premium
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
