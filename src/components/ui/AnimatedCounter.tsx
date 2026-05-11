import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export function AnimatedCounter({
  value,
  durationMs = 1500,
  format,
  className,
  style,
}: AnimatedCounterProps) {
  const { i18n } = useTranslation();
  // Group separators flip between 1.234 (de) and 1,234 (en) — use the
  // active i18n locale so the counter reads naturally for the user.
  const effectiveFormat = format ?? ((n: number) => Math.round(n).toLocaleString(i18n.language));
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
      {effectiveFormat(display)}
    </Text>
  );
}
