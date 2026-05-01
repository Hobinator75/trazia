import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface AnimatedCounterProps {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
  style?: TextStyle;
}

const defaultFormat = (n: number): string => Math.round(n).toLocaleString('de-DE');

export function AnimatedCounter({
  value,
  durationMs = 1500,
  format = defaultFormat,
  className,
  style,
}: AnimatedCounterProps) {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState<number>(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(value, {
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, durationMs, progress]);

  useAnimatedReaction(
    () => progress.value,
    (current) => {
      runOnJS(setDisplay)(current);
    },
  );

  return (
    <Text className={className} style={style}>
      {format(display)}
    </Text>
  );
}
