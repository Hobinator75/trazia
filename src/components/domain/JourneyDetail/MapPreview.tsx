import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import { useResolvedScheme } from '@/hooks/useResolvedScheme';
import { greatCirclePath, type LatLng } from '@/lib/geo';
import { colors, modeColors } from '@/theme/colors';

const HEIGHT = 300;

function regionFromPoints(points: LatLng[]): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  if (points.length === 0) {
    return { latitude: 0, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 };
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }
  const padLat = Math.max(1, (maxLat - minLat) * 0.4);
  const padLng = Math.max(1, (maxLng - minLng) * 0.4);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: maxLat - minLat + padLat,
    longitudeDelta: maxLng - minLng + padLng,
  };
}

export interface MapPreviewProps {
  journey: JourneyWithRefs;
}

export function MapPreview({ journey }: MapPreviewProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const scheme = useResolvedScheme();

  if (!journey.fromLocation || !journey.toLocation) {
    return (
      <View
        style={{ height: HEIGHT }}
        className="mx-4 my-3 items-center justify-center rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark"
      >
        <Text className="text-text-muted-light dark:text-text-muted">
          {t('journey.map_no_geo')}
        </Text>
      </View>
    );
  }

  const a: LatLng = { latitude: journey.fromLocation.lat, longitude: journey.fromLocation.lng };
  const b: LatLng = { latitude: journey.toLocation.lat, longitude: journey.toLocation.lng };
  const path = greatCirclePath(a, b, 64);
  const region = regionFromPoints([a, b]);
  const stroke = modeColors[journey.mode as keyof typeof modeColors] ?? colors.primary;

  return (
    <Pressable
      className="mx-4 my-3 overflow-hidden rounded-2xl border border-border-light dark:border-border-dark"
      style={{ height: HEIGHT }}
      onPress={() => router.push({ pathname: '/map', params: { focus: journey.id } })}
    >
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        userInterfaceStyle={scheme}
      >
        <Polyline
          coordinates={path}
          strokeColor={stroke}
          strokeWidth={3}
          geodesic={journey.routeType !== 'bezier'}
        />
        <Marker coordinate={a} pinColor={stroke} title={journey.fromLocation.name} />
        <Marker coordinate={b} pinColor={stroke} title={journey.toLocation.name} />
      </MapView>
    </Pressable>
  );
}
