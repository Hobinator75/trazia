import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import {
  deleteJourney,
  duplicateJourney,
  getJourneyExtras,
  getJourneyWithRefsById,
  type JourneyExtras,
  type JourneyWithRefs,
} from '@/db/repositories/journey.repository';

import { MapPreview } from '@/components/domain/JourneyDetail/MapPreview';
import { RouteHero } from '@/components/domain/JourneyDetail/RouteHero';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import {
  formatCabin,
  formatDistance,
  formatDuration,
  formatTimestamp,
  shareSnippet,
} from '@/lib/journeys/format';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

interface StatTileProps {
  label: string;
  value: string;
}
function StatTile({ label, value }: StatTileProps) {
  return (
    <View className="flex-1 rounded-2xl border border-border-dark bg-surface-dark p-3">
      <Text className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </Text>
      <Text className="mt-1 text-base font-semibold text-text-light" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PillRow({ items, color = colors.primary }: { items: string[]; color?: string }) {
  if (items.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => (
        <View
          key={item}
          className="rounded-full border px-3 py-1"
          style={{ borderColor: `${color}66`, backgroundColor: `${color}1F` }}
        >
          <Text className="text-xs" style={{ color }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MoreMenu({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: 'duplicate' | 'share' | 'add_to_trip' | 'delete') => void;
}) {
  const insets = useSafeAreaInsets();
  const items: {
    id: 'duplicate' | 'share' | 'add_to_trip' | 'delete';
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    danger?: boolean;
  }[] = [
    { id: 'duplicate', label: 'Duplizieren', icon: 'copy-outline' },
    { id: 'share', label: 'Teilen', icon: 'share-outline' },
    { id: 'add_to_trip', label: 'Zu Reise hinzufügen', icon: 'folder-open-outline' },
    { id: 'delete', label: 'Löschen', icon: 'trash-outline', danger: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          className="rounded-t-3xl bg-surface-dark"
          style={{ paddingBottom: insets.bottom + 8 }}
          onPress={() => {}}
        >
          {items.map((item, idx) => (
            <Pressable
              key={item.id}
              onPress={() => {
                onSelect(item.id);
                onClose();
              }}
              className={`flex-row items-center gap-3 px-4 py-4 active:bg-background-dark ${
                idx > 0 ? 'border-t border-border-dark' : ''
              }`}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.danger ? colors.danger : colors.text.light}
              />
              <Text className={`text-base ${item.danger ? 'text-danger' : 'text-text-light'}`}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function JourneyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const insets = useSafeAreaInsets();

  const [journey, setJourney] = useState<JourneyWithRefs | null>(null);
  const [extras, setExtras] = useState<JourneyExtras | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [j, ex] = await Promise.all([getJourneyWithRefsById(db, id), getJourneyExtras(db, id)]);
    setJourney(j ?? null);
    setExtras(ex);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleShare = useCallback(async () => {
    if (!journey) return;
    const message = shareSnippet(journey);
    try {
      const canUseExpo = await Sharing.isAvailableAsync();
      if (canUseExpo) {
        await Share.share({ message });
      } else {
        await Share.share({ message });
      }
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Teilen fehlgeschlagen', {
        variant: 'error',
      });
    }
  }, [journey, showSnackbar]);

  const handleDelete = useCallback(() => {
    if (!journey) return;
    Alert.alert('Reise löschen?', 'Diese Aktion kann nicht rückgängig gemacht werden.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteJourney(db, journey.id);
            showSnackbar('Reise gelöscht', { variant: 'success' });
            router.back();
          } catch (e) {
            showSnackbar(e instanceof Error ? e.message : 'Fehler beim Löschen', {
              variant: 'error',
            });
          }
        },
      },
    ]);
  }, [journey, router, showSnackbar]);

  const handleDuplicate = useCallback(async () => {
    if (!journey) return;
    try {
      const dup = await duplicateJourney(db, journey.id);
      showSnackbar('Reise dupliziert', { variant: 'success' });
      router.replace({ pathname: '/journeys/[id]', params: { id: dup.id } });
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Fehler beim Duplizieren', {
        variant: 'error',
      });
    }
  }, [journey, router, showSnackbar]);

  if (loading) {
    return <LoadingScreen subtitle="Reise wird geladen…" />;
  }
  if (!journey) {
    return (
      <View className="flex-1 items-center justify-center bg-background-dark px-6">
        <Text className="text-lg text-text-muted">Reise nicht gefunden</Text>
      </View>
    );
  }

  const photoUri = extras?.photoUris[0];
  const aircraftLabel = journey.vehicle
    ? [journey.vehicle.code, journey.vehicle.manufacturer, journey.vehicle.model]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <View className="flex-1 bg-background-dark">
      <Stack.Screen
        options={{
          headerTransparent: true,
          headerTitle: '',
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-black/40"
            >
              <Ionicons name="chevron-back" size={22} color="white" />
            </Pressable>
          ),
          headerRight: () => (
            <View className="mr-2 flex-row items-center gap-2">
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/journeys/edit/[id]',
                    params: { id: journey.id },
                  })
                }
                hitSlop={12}
                className="h-9 w-9 items-center justify-center rounded-full bg-black/40"
              >
                <Ionicons name="create-outline" size={20} color="white" />
              </Pressable>
              <Pressable
                onPress={() => setMenuOpen(true)}
                hitSlop={12}
                className="h-9 w-9 items-center justify-center rounded-full bg-black/40"
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="white" />
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
        <RouteHero journey={journey} {...(photoUri ? { photoUri } : {})} />

        <View className="mx-4 mt-3 flex-row gap-2">
          <StatTile label="Distanz" value={formatDistance(journey.distanceKm)} />
          <StatTile label="Dauer" value={formatDuration(journey.durationMinutes)} />
          <StatTile label="Klasse" value={formatCabin(journey.cabinClass)} />
          <StatTile label="Sitz" value={journey.seatNumber ?? '—'} />
        </View>

        <MapPreview journey={journey} />

        {aircraftLabel ? (
          <View className="mx-4 mb-3 rounded-2xl border border-border-dark bg-surface-dark p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Aircraft
            </Text>
            <Text className="mt-1 text-base text-text-light">{aircraftLabel}</Text>
            {journey.vehicle?.category ? (
              <Text className="text-xs text-text-muted">{journey.vehicle.category}</Text>
            ) : null}
          </View>
        ) : null}

        {journey.notes ? (
          <View className="mx-4 mb-3 rounded-2xl border border-border-dark bg-surface-dark p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Notizen
            </Text>
            <Text className="mt-1 text-base text-text-light">{journey.notes}</Text>
          </View>
        ) : null}

        {extras && (extras.tags.length > 0 || extras.companions.length > 0) ? (
          <View className="mx-4 mb-3 gap-3">
            {extras.tags.length > 0 ? (
              <View>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Tags
                </Text>
                <PillRow items={extras.tags} color={colors.primary} />
              </View>
            ) : null}
            {extras.companions.length > 0 ? (
              <View>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Begleitung
                </Text>
                <PillRow items={extras.companions} color={colors.secondary} />
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="mx-4 mt-2">
          <Text className="text-xs text-text-muted">
            Erstellt am {formatTimestamp(journey.createdAt)} · Bearbeitet am{' '}
            {formatTimestamp(journey.updatedAt)}
          </Text>
        </View>
      </ScrollView>

      <MoreMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(action) => {
          if (action === 'duplicate') void handleDuplicate();
          if (action === 'share') void handleShare();
          if (action === 'delete') handleDelete();
          if (action === 'add_to_trip')
            showSnackbar('Trips kommen in CC-3.9.', { variant: 'info' });
        }}
      />
    </View>
  );
}
