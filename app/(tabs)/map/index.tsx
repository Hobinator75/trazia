import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Globe3D } from '@/components/domain/Globe3D';
import { MapView2D } from '@/components/domain/MapView2D';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useJourneys } from '@/hooks/useJourneys';
import { colors } from '@/theme/colors';

type Mode = '2d' | '3d';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { journeys, loading } = useJourneys();
  const [mode, setMode] = useState<Mode>('3d');

  if (loading && journeys.length === 0) {
    return <LoadingScreen subtitle="Karte wird geladen…" />;
  }

  return (
    <View className="flex-1 bg-background-dark">
      {journeys.length === 0 ? (
        <EmptyState
          icon="globe-outline"
          title="Noch keine Reisen"
          subtitle="Erfasse deine erste Reise — sie taucht hier sofort auf."
        />
      ) : mode === '3d' ? (
        <Globe3D journeys={journeys} />
      ) : (
        <MapView2D journeys={journeys} />
      )}

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
