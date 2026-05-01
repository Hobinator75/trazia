import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const ROTATION_PERIOD_MS = 12_000;

export interface RotatingMiniGlobeProps {
  size?: number;
}

export function RotatingMiniGlobe({ size = 64 }: RotatingMiniGlobeProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: ROTATION_PERIOD_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: '#0F172A',
      }}
    >
      <Animated.View style={[{ flex: 1 }, style]}>
        <LinearGradient
          colors={['#1E40AF', '#0B1B3F', '#06121F']}
          start={{ x: 0.3, y: 0.2 }}
          end={{ x: 0.8, y: 0.9 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
