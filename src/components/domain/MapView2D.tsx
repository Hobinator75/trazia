import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import type { Location } from '@/db/schema';
import { useResolvedScheme } from '@/hooks/useResolvedScheme';
import { greatCirclePath, type LatLng } from '@/lib/geo';
import { colors, modeColors, paletteFor } from '@/theme/colors';

export type MapViewMode = 'all' | 'by_year' | 'by_mode';

export interface MapView2DProps {
  journeys: JourneyWithRefs[];
}

interface LocationStat {
  location: Location;
  visits: number;
  lastDate: string;
}

interface PinSelection {
  location: Location;
  visits: number;
  lastDate: string;
  countryCode: string | null;
}

const yearOf = (iso: string): number => Number.parseInt(iso.slice(0, 4), 10);

function buildLocationStats(journeys: JourneyWithRefs[]): Map<string, LocationStat> {
  const map = new Map<string, LocationStat>();
  for (const j of journeys) {
    for (const side of [j.fromLocation, j.toLocation] as const) {
      if (!side) continue;
      const existing = map.get(side.id);
      if (existing) {
        existing.visits++;
        if (j.date > existing.lastDate) existing.lastDate = j.date;
      } else {
        map.set(side.id, { location: side, visits: 1, lastDate: j.date });
      }
    }
  }
  return map;
}

function pinScale(visits: number, max: number): number {
  if (max <= 1) return 1;
  return 0.8 + (visits / max) * 0.7;
}

export function MapView2D({ journeys }: MapView2DProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const palette = paletteFor(scheme);
  const [viewMode, setViewMode] = useState<MapViewMode>('all');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedPin, setSelectedPin] = useState<PinSelection | null>(null);

  const filtered = useMemo(() => {
    if (viewMode === 'by_year' && selectedYear !== null) {
      return journeys.filter((j) => yearOf(j.date) === selectedYear);
    }
    return journeys;
  }, [journeys, viewMode, selectedYear]);

  // Pre-compute great-circle paths once per filtered set; without this they
  // re-run on every render (mode toggle, year picker, sheet open) — N journeys
  // × 64 points × cosine math gets noticeable past 100 journeys.
  const journeyArcs = useMemo(
    () =>
      filtered.map((journey) => {
        if (!journey.fromLocation || !journey.toLocation) return null;
        const a: LatLng = {
          latitude: journey.fromLocation.lat,
          longitude: journey.fromLocation.lng,
        };
        const b: LatLng = {
          latitude: journey.toLocation.lat,
          longitude: journey.toLocation.lng,
        };
        return {
          journey,
          path: greatCirclePath(a, b, 64),
          stroke: modeColors[journey.mode as keyof typeof modeColors] ?? colors.primary,
        };
      }),
    [filtered],
  );

  const locationStats = useMemo(() => buildLocationStats(filtered), [filtered]);
  const maxVisits = useMemo(() => {
    let max = 0;
    for (const s of locationStats.values()) if (s.visits > max) max = s.visits;
    return max;
  }, [locationStats]);

  const yearOptions = useMemo(() => {
    const set = new Set<number>();
    for (const j of journeys) set.add(yearOf(j.date));
    return [...set].sort((a, b) => b - a);
  }, [journeys]);

  return (
    <View className="flex-1">
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        userInterfaceStyle={scheme}
        initialRegion={{
          latitude: 30,
          longitude: 0,
          latitudeDelta: 90,
          longitudeDelta: 180,
        }}
      >
        {journeyArcs.map((arc) => {
          if (!arc) return null;
          return (
            <Polyline
              key={arc.journey.id}
              coordinates={arc.path}
              strokeColor={arc.stroke}
              strokeWidth={2}
              tappable
              onPress={() =>
                router.push({ pathname: '/journeys/[id]', params: { id: arc.journey.id } })
              }
              geodesic={arc.journey.routeType !== 'bezier'}
            />
          );
        })}
        {[...locationStats.values()].map((stat) => {
          const scale = pinScale(stat.visits, maxVisits);
          return (
            <Marker
              key={stat.location.id}
              coordinate={{
                latitude: stat.location.lat,
                longitude: stat.location.lng,
              }}
              onPress={() =>
                setSelectedPin({
                  location: stat.location,
                  visits: stat.visits,
                  lastDate: stat.lastDate,
                  countryCode: stat.location.country,
                })
              }
            >
              <View
                style={{
                  transform: [{ scale }],
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: colors.primary,
                  borderWidth: 2,
                  borderColor: 'white',
                }}
              />
            </Marker>
          );
        })}
      </MapView>

      <View className="absolute left-4 right-4 flex-row gap-2" style={{ top: insets.top + 8 }}>
        {(['all', 'by_year', 'by_mode'] as const).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => setViewMode(mode)}
            className={`flex-1 items-center rounded-full border px-3 py-2 ${
              viewMode === mode
                ? 'border-primary bg-primary/30'
                : 'border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80'
            }`}
          >
            <Text
              className={`text-xs ${
                viewMode === mode ? 'text-primary' : 'text-text-dark dark:text-text-light'
              }`}
            >
              {mode === 'all'
                ? t('map.view_all')
                : mode === 'by_year'
                  ? t('map.view_year')
                  : t('map.view_mode')}
            </Text>
          </Pressable>
        ))}
      </View>

      {viewMode === 'by_year' && yearOptions.length > 0 ? (
        <View className="absolute left-4 right-4 flex-row gap-2" style={{ top: insets.top + 56 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {yearOptions.map((y) => (
              <Pressable
                key={y}
                onPress={() => setSelectedYear(selectedYear === y ? null : y)}
                className={`rounded-full border px-3 py-1.5 ${
                  selectedYear === y
                    ? 'border-primary bg-primary/30'
                    : 'border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80'
                }`}
              >
                <Text
                  className={`text-xs ${
                    selectedYear === y ? 'text-primary' : 'text-text-dark dark:text-text-light'
                  }`}
                >
                  {y}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Modal
        transparent
        animationType="slide"
        visible={selectedPin !== null}
        onRequestClose={() => setSelectedPin(null)}
      >
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setSelectedPin(null)}>
          <Pressable
            className="rounded-t-3xl bg-surface-light dark:bg-surface-dark p-5"
            style={{ paddingBottom: insets.bottom + 16 }}
            onPress={() => {}}
          >
            {selectedPin ? (
              <>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-text-dark dark:text-text-light">
                      {selectedPin.location.name}
                    </Text>
                    {selectedPin.location.city ? (
                      <Text className="text-sm text-text-muted-light dark:text-text-muted">
                        {selectedPin.location.city}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable onPress={() => setSelectedPin(null)} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.text} />
                  </Pressable>
                </View>
                <View className="mt-3 flex-row gap-3">
                  <View className="flex-1 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-3">
                    <Text className="text-[10px] uppercase tracking-wider text-text-muted-light dark:text-text-muted">
                      {t('map.pin_country')}
                    </Text>
                    <Text className="text-base font-semibold text-text-dark dark:text-text-light">
                      {selectedPin.countryCode ?? '—'}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-3">
                    <Text className="text-[10px] uppercase tracking-wider text-text-muted-light dark:text-text-muted">
                      {t('map.pin_visits')}
                    </Text>
                    <Text className="text-base font-semibold text-text-dark dark:text-text-light">
                      {selectedPin.visits}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-3">
                    <Text className="text-[10px] uppercase tracking-wider text-text-muted-light dark:text-text-muted">
                      {t('map.pin_last')}
                    </Text>
                    <Text className="text-base font-semibold text-text-dark dark:text-text-light">
                      {selectedPin.lastDate}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
