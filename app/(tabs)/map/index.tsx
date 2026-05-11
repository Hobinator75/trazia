import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Globe3D } from '@/components/domain/Globe3D';
import { MapView2D } from '@/components/domain/MapView2D';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useJourneys } from '@/hooks/useJourneys';
import { colors } from '@/theme/colors';

type Mode = '2d' | '3d';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { journeys, loading } = useJourneys();
  const [mode, setMode] = useState<Mode>('2d');

  if (loading && journeys.length === 0) {
    return <LoadingScreen subtitle="Karte wird geladen…" />;
  }

  const isEmpty = journeys.length === 0;

  return (
    <View className="flex-1 bg-background-dark">
      {mode === '3d' ? <Globe3D journeys={journeys} /> : <MapView2D journeys={journeys} />}

      {isEmpty ? (
        <View
          pointerEvents="none"
          className="absolute left-4 right-4 items-center"
          style={{ bottom: insets.bottom + 24 }}
        >
          <View className="flex-row items-center gap-2 rounded-full border border-border-dark bg-surface-dark/85 px-4 py-2">
            <Ionicons name="globe-outline" size={14} color={colors.text.light} />
            <Text className="text-xs text-text-light">
              Erfasse deine erste Reise — sie erscheint hier sofort.
            </Text>
          </View>
        </View>
      ) : null}

      <View
        className="absolute right-4 flex-row gap-1 rounded-full border border-border-dark bg-surface-dark/80 p-1"
        style={{ top: insets.top + 8 }}
      >
        <Pressable
          onPress={() => setMode('3d')}
          className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${
            mode === '3d' ? 'bg-primary/30' : ''
          }`}
        >
          <Ionicons
            name="globe-outline"
            size={14}
            color={mode === '3d' ? colors.primary : colors.text.light}
          />
          <Text className={`text-xs ${mode === '3d' ? 'text-primary' : 'text-text-light'}`}>
            3D
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('2d')}
          className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${
            mode === '2d' ? 'bg-primary/30' : ''
          }`}
        >
          <Ionicons
            name="map-outline"
            size={14}
            color={mode === '2d' ? colors.primary : colors.text.light}
          />
          <Text className={`text-xs ${mode === '2d' ? 'text-primary' : 'text-text-light'}`}>
            2D
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
