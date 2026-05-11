import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSnackbarStore } from '@/stores/snackbarStore';

const VARIANT_CLASS: Record<string, string> = {
  info: 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark',
  success: 'bg-success border-success',
  error: 'bg-danger border-danger',
};

// For info-variant the text needs to flip with the surface; success/error
// stay light because the underlying colour is saturated in both modes.
const VARIANT_TEXT: Record<string, string> = {
  info: 'text-text-dark dark:text-text-light',
  success: 'text-white',
  error: 'text-white',
};

export function Snackbar() {
  const current = useSnackbarStore((s) => s.current);
  const dismiss = useSnackbarStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!current) return;
    translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(1, { duration: 220 });
    const timer = setTimeout(() => {
      translateY.value = withTiming(120, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
      setTimeout(dismiss, 220);
    }, current.durationMs);
    return () => clearTimeout(timer);
  }, [current, dismiss, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!current) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        animatedStyle,
        { position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 16 },
      ]}
      className="px-4"
    >
      <View
        className={`rounded-2xl border px-4 py-3 ${VARIANT_CLASS[current.variant] ?? VARIANT_CLASS.info}`}
      >
        <Text className={`text-base ${VARIANT_TEXT[current.variant] ?? VARIANT_TEXT.info}`}>
          {current.message}
        </Text>
      </View>
    </Animated.View>
  );
}
