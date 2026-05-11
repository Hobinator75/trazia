import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import { useResolvedScheme } from '@/hooks/useResolvedScheme';
import { formatDateLong, journeyTitle } from '@/lib/journeys/format';
import { colors, paletteFor } from '@/theme/colors';

export interface RouteHeroProps {
  journey: JourneyWithRefs;
  photoUri?: string;
  height?: number;
}

export function RouteHero({ journey, photoUri, height = 260 }: RouteHeroProps) {
  const { from, to } = journeyTitle(journey);
  const scheme = useResolvedScheme();
  const palette = paletteFor(scheme);
  const subtitleParts = [
    formatDateLong(journey.date),
    journey.operator?.name,
    journey.serviceNumber,
  ].filter(Boolean);

  // The gradient overlay keeps the title legible against the photo. Use
  // the scheme-aware surface colour as the fade target so the strip
  // blends with the rest of the detail page in either mode.
  const gradientStops =
    scheme === 'dark'
      ? (['transparent', 'rgba(10,14,26,0.6)', 'rgba(10,14,26,0.95)'] as const)
      : (['transparent', 'rgba(249,250,251,0.6)', 'rgba(249,250,251,0.95)'] as const);

  return (
    <View style={{ height, backgroundColor: palette.surface, justifyContent: 'flex-end' }}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{ position: 'absolute', inset: 0 }}
          contentFit="cover"
        />
      ) : (
        <FallbackBackground />
      )}
      <LinearGradient
        colors={gradientStops}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <View className="px-5 pb-5">
        <View className="flex-row items-center gap-3">
          <Text
            className="text-4xl font-bold tracking-wider"
            style={photoUri ? { color: '#F9FAFB' } : { color: palette.text }}
          >
            {from}
          </Text>
          <Ionicons name="arrow-forward" size={24} color={photoUri ? '#F9FAFB' : palette.text} />
          <Text
            className="text-4xl font-bold tracking-wider"
            style={photoUri ? { color: '#F9FAFB' } : { color: palette.text }}
          >
            {to}
          </Text>
        </View>
        {subtitleParts.length > 0 ? (
          <Text
            className="mt-1 text-sm"
            style={photoUri ? { color: 'rgba(249,250,251,0.8)' } : { color: palette.textMuted }}
          >
            {subtitleParts.join(' · ')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function FallbackBackground() {
  // Stays dark-blue in both modes — the journey-detail hero is intentionally
  // dramatic regardless of the surrounding scheme.
  return (
    <LinearGradient
      colors={['#0F172A', '#1E3A8A', '#0F172A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
    />
  );
}
