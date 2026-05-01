import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadAchievements } from '@/lib/achievements/engine';
import type { Achievement, UnlockResult } from '@/lib/achievements/types';
import { useAchievementStore } from '@/stores/achievementStore';

const TOAST_VISIBLE_MS = 3500;
const ANIM_MS = 240;

function findAchievement(id: string): Achievement | undefined {
  return loadAchievements().find((a) => a.id === id);
}

export function AchievementToast() {
  const [queue, setQueue] = useState<UnlockResult[]>([]);
  const [current, setCurrent] = useState<UnlockResult | null>(null);
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const unsubscribe = useAchievementStore.getState().addListener((unlock) => {
      setQueue((q) => [...q, unlock]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (current !== null || queue.length === 0) return;
    setCurrent(queue[0]!);
    setQueue((q) => q.slice(1));
  }, [current, queue]);

  useEffect(() => {
    if (!current) return;
    translateY.value = withTiming(0, { duration: ANIM_MS, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(1, { duration: ANIM_MS });

    const timer = setTimeout(() => {
      translateY.value = withTiming(-200, { duration: ANIM_MS });
      opacity.value = withTiming(0, { duration: ANIM_MS });
      setTimeout(() => setCurrent(null), ANIM_MS);
    }, TOAST_VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [current, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!current) return null;

  const achievement = findAchievement(current.achievementId);
  const title = achievement?.title ?? current.achievementId;
  const description = achievement?.description ?? 'Achievement freigeschaltet';

  return (
    <Animated.View
      pointerEvents="none"
      style={[animatedStyle, { position: 'absolute', left: 0, right: 0, top: insets.top + 8 }]}
      className="px-4"
    >
      <View className="flex-row items-center gap-3 rounded-2xl border border-primary bg-surface-dark px-4 py-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/20">
          <Text className="text-xl">🏆</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wider text-primary">
            Achievement freigeschaltet
          </Text>
          <Text className="text-base font-bold text-text-light" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-xs text-text-muted" numberOfLines={2}>
            {description}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
