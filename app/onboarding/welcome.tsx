import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RotatingMiniGlobe } from '@/components/ui/RotatingMiniGlobe';

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withRepeat(
      withTiming(1.05, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [logoOpacity, logoScale]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top + 24 }}>
      <View className="flex-1 items-center justify-center px-8">
        <Animated.View style={logoStyle} className="mb-6 items-center">
          <RotatingMiniGlobe size={140} />
        </Animated.View>
        <Text className="text-5xl font-bold tracking-tight text-text-light">Trazia</Text>
        <Text className="mt-2 text-lg text-text-muted">Trace your travels.</Text>
        <View className="mt-6 h-1 w-32 overflow-hidden rounded-full">
          <LinearGradient
            colors={['#3B82F6', '#A78BFA', '#22D3EE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <View className="px-6" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={() => router.push('/onboarding/modes')}
          className="items-center rounded-full bg-primary py-4 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">Loslegen</Text>
        </Pressable>
      </View>
    </View>
  );
}
