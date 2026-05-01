import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadAchievements } from '@/lib/achievements/engine';
import { tierStyle } from '@/lib/achievements/tier';
import type { Achievement, UnlockResult } from '@/lib/achievements/types';
import { playUnlockSound } from '@/lib/sound';
import { useAchievementStore } from '@/stores/achievementStore';

const TOAST_VISIBLE_MS = 4000;
const ANIM_MS = 240;
const QUEUE_GAP_MS = 200;

function findAchievement(id: string): Achievement | undefined {
  return loadAchievements().find((a) => a.id === id);
}

export function AchievementToast() {
  const router = useRouter();
  const [queue, setQueue] = useState<UnlockResult[]>([]);
  const [current, setCurrent] = useState<UnlockResult | null>(null);
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = useAchievementStore.getState().addListener((unlock) => {
      setQueue((q) => [...q, unlock]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (current !== null || queue.length === 0) return;
    const next = queue[0]!;
    setCurrent(next);
    setQueue((q) => q.slice(1));
    void playUnlockSound();
  }, [current, queue]);

  useEffect(() => {
    if (!current) return;

    translateY.value = withTiming(0, { duration: ANIM_MS, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(1, { duration: ANIM_MS });

    dismissTimer.current = setTimeout(() => {
      hide();
    }, TOAST_VISIBLE_MS);

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const hide = (afterDismiss?: () => void) => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    translateY.value = withTiming(-200, { duration: ANIM_MS });
    opacity.value = withTiming(0, { duration: ANIM_MS });
    setTimeout(() => {
      setCurrent(null);
      afterDismiss?.();
    }, ANIM_MS + QUEUE_GAP_MS);
  };

  const handleTap = () => {
    if (!current) return;
    hide(() => {
      router.push({
        pathname: '/stats/achievement/[id]',
        params: { id: current.achievementId },
      });
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!current) return null;

  const achievement = findAchievement(current.achievementId);
  const tier = tierStyle(achievement?.tier);
  const title = achievement?.title ?? current.achievementId;

  return (
    <Animated.View
      style={[animatedStyle, { position: 'absolute', left: 0, right: 0, top: insets.top + 8 }]}
      className="px-4"
    >
      <Pressable onPress={handleTap}>
        <View
          className="overflow-hidden rounded-2xl border"
          style={{
            borderColor: tier.primary,
            shadowColor: tier.glow,
            shadowOpacity: 0.6,
            shadowRadius: 12,
          }}
        >
          {tier.isGradient ? (
            <LinearGradient
              colors={[tier.primary, tier.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', inset: 0 }}
            />
          ) : (
            <View style={{ position: 'absolute', inset: 0, backgroundColor: tier.primary }} />
          )}
          <View className="flex-row items-center gap-3 px-4 py-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-black/30">
              <Text className="text-2xl">{tier.badge}</Text>
            </View>
            <View className="flex-1">
              <Text
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: tier.textOnPrimary }}
              >
                Erfolg freigeschaltet · {tier.label}
              </Text>
              <Text
                className="text-base font-bold"
                style={{ color: tier.textOnPrimary }}
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
