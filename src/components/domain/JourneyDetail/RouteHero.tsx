import { Ionicons } from '@expo/vector-icons';
import { Image, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import { formatDateLong, journeyTitle } from '@/lib/journeys/format';
import { colors } from '@/theme/colors';

export interface RouteHeroProps {
  journey: JourneyWithRefs;
  photoUri?: string;
  height?: number;
}

export function RouteHero({ journey, photoUri, height = 260 }: RouteHeroProps) {
  const { from, to } = journeyTitle(journey);
  const subtitleParts = [
    formatDateLong(journey.date),
    journey.operator?.name,
    journey.serviceNumber,
  ].filter(Boolean);

  return (
    <View style={{ height, backgroundColor: colors.surface.dark, justifyContent: 'flex-end' }}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{ position: 'absolute', inset: 0 }}
          resizeMode="cover"
        />
      ) : (
        <FallbackBackground />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(10,14,26,0.6)', 'rgba(10,14,26,0.95)']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <View className="px-5 pb-5">
        <View className="flex-row items-center gap-3">
          <Text className="text-4xl font-bold tracking-wider text-text-light">{from}</Text>
          <Ionicons name="arrow-forward" size={24} color={colors.text.light} />
          <Text className="text-4xl font-bold tracking-wider text-text-light">{to}</Text>
        </View>
        {subtitleParts.length > 0 ? (
          <Text className="mt-1 text-sm text-text-light/80">{subtitleParts.join(' · ')}</Text>
        ) : null}
      </View>
    </View>
  );
}

function FallbackBackground() {
  return (
    <LinearGradient
      colors={['#0F172A', '#1E3A8A', '#0F172A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
    />
  );
}
