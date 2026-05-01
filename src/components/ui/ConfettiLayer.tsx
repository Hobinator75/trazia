import { useEffect, useRef, useState } from 'react';
import { Dimensions, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

import { loadAchievements } from '@/lib/achievements/engine';
import { tierStyle } from '@/lib/achievements/tier';
import { useAchievementStore } from '@/stores/achievementStore';

interface Burst {
  id: number;
  particleCount: number;
  colors: string[];
}

const BURST_LIFETIME_MS = 2200;

export function ConfettiLayer() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    const unsubscribe = useAchievementStore.getState().addListener((unlock) => {
      const achievement = loadAchievements().find((a) => a.id === unlock.achievementId);
      const tier = tierStyle(achievement?.tier);
      const burst: Burst = {
        id: nextId.current++,
        particleCount: tier.particles,
        colors: tier.palette,
      };
      setBursts((prev) => [...prev, burst]);
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== burst.id));
      }, BURST_LIFETIME_MS);
    });
    return unsubscribe;
  }, []);

  if (bursts.length === 0) return null;

  const { width } = Dimensions.get('window');

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
    >
      {bursts.map((burst) => (
        <ConfettiCannon
          key={burst.id}
          count={burst.particleCount}
          origin={{ x: width / 2, y: -10 }}
          fallSpeed={2800}
          fadeOut
          autoStart
          colors={burst.colors}
        />
      ))}
    </View>
  );
}
