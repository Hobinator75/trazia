import { Image } from 'expo-image';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const ROTATION_PERIOD_MS = 24_000;

export interface RotatingMiniGlobeProps {
  size?: number;
}

// Pre-Bucket-B this was a flat blue LinearGradient and Tim reported the
// stats hero "shows only a disc, not a globe". Now it pans the same
// earth-day texture used by Globe3D inside a circular clip, giving an
// impression of a rotating planet without paying the three.js mounting
// cost on a tab the user passes through dozens of times a day.
//
// The image is stretched to 2× width and translated left-to-right so a
// continuous longitude band scrolls past the viewport. The transform
// loops in a single shared value to keep work on the UI thread.
const EARTH_TEXTURE = require('../../../assets/textures/earth-day.jpg');

export function RotatingMiniGlobe({ size = 64 }: RotatingMiniGlobeProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: ROTATION_PERIOD_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * size }],
  }));

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: '#06121F',
      }}
    >
      <Animated.View
        style={[{ width: size * 2, height: size, flexDirection: 'row' }, animatedStyle]}
      >
        <Image
          source={EARTH_TEXTURE}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
        <Image
          source={EARTH_TEXTURE}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      </Animated.View>
    </View>
  );
}
