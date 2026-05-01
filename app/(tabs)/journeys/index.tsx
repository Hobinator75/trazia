import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, SectionList, TextInput, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import {
  deleteJourney,
  duplicateJourney,
  type JourneyWithRefs,
} from '@/db/repositories/journey.repository';

import { type JourneyAction, JourneyActionSheet } from '@/components/domain/JourneyActionSheet';
import { JourneyCard } from '@/components/domain/JourneyCard';
import {
  EMPTY_FILTERS,
  isFilterActive,
  type JourneyFilters,
  JourneyFilterSheet,
} from '@/components/domain/JourneyFilterSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useJourneys } from '@/hooks/useJourneys';
import {
  applyFilters,
  buildFacets,
  groupByYearMonth,
  type JourneySection,
} from '@/lib/journeys/sections';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

function activeFilterCount(f: JourneyFilters): number {
  return f.modes.length + f.years.length + f.operatorIds.length + f.countries.length;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="bg-background-dark px-4 pb-1 pt-4">
      <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </Text>
    </View>
  );
}

function SwipeableRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <Swipeable
      friction={2}
      rightThreshold={48}
      renderRightActions={() => (
        <Pressable
          onPress={onDelete}
          className="my-1.5 mr-4 items-center justify-center rounded-2xl bg-danger px-5"
          accessibilityLabel="Löschen"
        >
          <Ionicons name="trash" size={22} color="white" />
        </Pressable>
      )}
    >
      {children}
    </Swipeable>
  );
}

export default function JourneysScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const { journeys, loading, reload } = useJourneys();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<JourneyFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [actionFor, setActionFor] = useState<JourneyWithRefs | null>(null);

  const facets = useMemo(() => buildFacets(journeys), [journeys]);
  const filtered = useMemo(
    () => applyFilters(journeys, filters, search),
    [journeys, filters, search],
  );
  const sections: JourneySection[] = useMemo(() => groupByYearMonth(filtered), [filtered]);
  const filterCount = activeFilterCount(filters);

  const handleConfirmDelete = useCallback(
    (journey: JourneyWithRefs) => {
      Alert.alert(
        'Reise löschen?',
        `${journey.fromLocation?.iata ?? journey.fromLocation?.name ?? '?'} → ${
          journey.toLocation?.iata ?? journey.toLocation?.name ?? '?'
        } wird endgültig entfernt.`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Löschen',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteJourney(db, journey.id);
                showSnackbar('Reise gelöscht', { variant: 'success' });
                await reload();
              } catch (e) {
                showSnackbar(e instanceof Error ? e.message : 'Fehler beim Löschen', {
                  variant: 'error',
                });
              }
            },
          },
        ],
      );
    },
    [reload, showSnackbar],
  );

  const handleAction = useCallback(
    async (action: JourneyAction) => {
      const target = actionFor;
      if (!target) return;
      setActionFor(null);
      switch (action) {
        case 'edit':
          router.push({ pathname: '/journeys/edit/[id]', params: { id: target.id } });
          break;
        case 'duplicate':
          try {
            await duplicateJourney(db, target.id);
            showSnackbar('Reise dupliziert', { variant: 'success' });
            await reload();
          } catch (e) {
            showSnackbar(e instanceof Error ? e.message : 'Fehler beim Duplizieren', {
              variant: 'error',
            });
          }
          break;
        case 'add_to_trip':
          showSnackbar('Trips kommen in CC-3.9.', { variant: 'info' });
          break;
        case 'delete':
          handleConfirmDelete(target);
          break;
      }
    },
    [actionFor, handleConfirmDelete, reload, router, showSnackbar],
  );

  if (loading && journeys.length === 0) {
    return <LoadingScreen subtitle="Reisen werden geladen…" />;
  }

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <Text className="text-3xl font-bold tracking-tight text-text-light">Trazia</Text>
        <Pressable
          onPress={() => setFilterOpen(true)}
          className="relative h-10 w-10 items-center justify-center rounded-full border border-border-dark bg-surface-dark active:opacity-80"
          accessibilityLabel="Filter"
        >
          <Ionicons name="options-outline" size={20} color={colors.text.light} />
          {filterCount > 0 ? (
            <View className="absolute -right-1 -top-1 min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1">
              <Text className="text-[10px] font-bold text-white">{filterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View className="border-b border-border-dark px-4 pb-3">
        <View className="flex-row items-center gap-2 rounded-xl border border-border-dark bg-surface-dark px-3">
          <Ionicons name="search" size={18} color={colors.text.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Suche nach Stadt, Code, Airline…"
            placeholderTextColor={colors.text.muted}
            className="flex-1 py-2.5 text-base text-text-light"
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.text.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
        renderItem={({ item }) => (
          <SwipeableRow onDelete={() => handleConfirmDelete(item)}>
            <JourneyCard
              journey={item}
              onPress={(j) => router.push({ pathname: '/journeys/[id]', params: { id: j.id } })}
              onLongPress={(j) => setActionFor(j)}
            />
          </SwipeableRow>
        )}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={5}
        ListEmptyComponent={
          <EmptyState
            icon={isFilterActive(filters) || search.length > 0 ? 'filter' : 'compass'}
            title={
              isFilterActive(filters) || search.length > 0
                ? 'Keine passenden Reisen'
                : 'Noch keine Reisen'
            }
            subtitle={
              isFilterActive(filters) || search.length > 0
                ? 'Passe Filter oder Suche an, um Reisen zu finden.'
                : 'Tippe auf das + Symbol, um deine erste Reise zu erfassen.'
            }
          />
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />
        }
      />

      <Link href="/journeys/add" asChild>
        <Pressable
          className="absolute right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
          style={{ bottom: 24 + insets.bottom }}
          accessibilityLabel="Reise hinzufügen"
        >
          <Ionicons name="add" size={28} color="white" />
        </Pressable>
      </Link>

      <JourneyFilterSheet
        visible={filterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
        modeOptions={facets.modes}
        yearOptions={facets.years}
        operatorOptions={facets.operators}
        countryOptions={facets.countries}
      />

      <JourneyActionSheet
        visible={actionFor !== null}
        onClose={() => setActionFor(null)}
        onSelect={handleAction}
      />
    </View>
  );
}
