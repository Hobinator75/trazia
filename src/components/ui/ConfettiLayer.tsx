import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useAchievementStore } from '@/stores/achievementStore';

const PARTICLE_COUNT = 36;
const FALL_DURATION_MS = 2800;
const PALETTE = ['#3B82F6', '#10B981', '#F97316', '#06B6D4', '#F59E0B', '#EC4899'];

interface ParticleSpec {
  startX: number;
  delay: number;
  color: string;
  size: number;
  endX: number;
  spin: number;
}

function spawnParticles(): ParticleSpec[] {
  const { width } = Dimensions.get('window');
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const startX = Math.random() * width;
    return {
      startX,
      delay: Math.random() * 500,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)]!,
      size: 6 + Math.random() * 6,
      endX: startX + (Math.random() - 0.5) * width * 0.5,
      spin: 360 + Math.random() * 720,
    };
  });
}

interface BurstProps {
  particles: ParticleSpec[];
  onDone: () => void;
}

function Burst({ particles, onDone }: BurstProps) {
  const { height } = Dimensions.get('window');
  return (
    <>
      {particles.map((spec, idx) => (
        <Particle
          key={idx}
          spec={spec}
          height={height}
          isLast={idx === particles.length - 1}
          onLastDone={onDone}
        />
      ))}
    </>
  );
}

interface ParticleProps {
  spec: ParticleSpec;
  height: number;
  isLast: boolean;
  onLastDone: () => void;
}

function Particle({ spec, height, isLast, onLastDone }: ParticleProps) {
  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      spec.delay,
      withTiming(1, { duration: FALL_DURATION_MS, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished && isLast) runOnJS(onLastDone)();
      }),
    );
    rotation.value = withDelay(
      spec.delay,
      withTiming(spec.spin, { duration: FALL_DURATION_MS, easing: Easing.linear }),
    );
  }, [progress, rotation, spec, isLast, onLastDone]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const x = spec.startX + (spec.endX - spec.startX) * t;
    const y = -20 + (height + 40) * t;
    const opacity = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
    return {
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${rotation.value}deg` }],
      opacity,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: spec.size,
          height: spec.size,
          backgroundColor: spec.color,
          borderRadius: 1,
          top: 0,
          left: 0,
        },
        style,
      ]}
    />
  );
}

export function ConfettiLayer() {
  const [bursts, setBursts] = useState<{ id: number; particles: ParticleSpec[] }[]>([]);

  useEffect(() => {
    let nextId = 1;
    const unsubscribe = useAchievementStore.getState().addListener(() => {
      setBursts((prev) => [...prev, { id: nextId++, particles: spawnParticles() }]);
    });
    return unsubscribe;
  }, []);

  if (bursts.length === 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {bursts.map((burst) => (
        <Burst
          key={burst.id}
          particles={burst.particles}
          onDone={() => setBursts((prev) => prev.filter((b) => b.id !== burst.id))}
        />
      ))}
    </Animated.View>
  );
}
