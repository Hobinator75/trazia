import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, RefreshControl, SectionList, TextInput, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import {
  deleteJourney,
  duplicateJourney,
  type JourneyWithRefs,
} from '@/db/repositories/journey.repository';

import { AdaptiveBannerAd } from '@/components/domain/AdaptiveBannerAd';
import { type JourneyAction, JourneyActionSheet } from '@/components/domain/JourneyActionSheet';
import { JourneyCard } from '@/components/domain/JourneyCard';
import {
  EMPTY_FILTERS,
  isFilterActive,
  type JourneyFilters,
  JourneyFilterSheet,
} from '@/components/domain/JourneyFilterSheet';
import { PremiumUpsellSheet } from '@/components/domain/PremiumUpsellSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useJourneys } from '@/hooks/useJourneys';
import { useJourneyCountUpsell } from '@/hooks/useUpsellTriggers';
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
    <View className="bg-background-light dark:bg-background-dark px-4 pb-1 pt-4">
      <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
        {title}
      </Text>
    </View>
  );
}

function SwipeableRow({
  children,
  onDelete,
  deleteLabel,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel: string;
}) {
  return (
    <Swipeable
      friction={2}
      rightThreshold={48}
      renderRightActions={() => (
        <Pressable
          onPress={onDelete}
          className="my-1.5 mr-4 items-center justify-center rounded-2xl bg-danger px-5"
          accessibilityLabel={deleteLabel}
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
  const { t } = useTranslation();
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
  const upsell25 = useJourneyCountUpsell(journeys.length);

  const handleConfirmDelete = useCallback(
    (journey: JourneyWithRefs) => {
      Alert.alert(
        t('journey.delete_confirm_title'),
        t('journey.delete_confirm_body', {
          from: journey.fromLocation?.iata ?? journey.fromLocation?.name ?? '?',
          to: journey.toLocation?.iata ?? journey.toLocation?.name ?? '?',
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('journey.delete_label'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteJourney(db, journey.id);
                showSnackbar(t('journey.deleted'), { variant: 'success' });
                await reload();
              } catch (e) {
                showSnackbar(e instanceof Error ? e.message : t('journey.delete_failed'), {
                  variant: 'error',
                });
              }
            },
          },
        ],
      );
    },
    [reload, showSnackbar, t],
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
            showSnackbar(t('journey.duplicated'), { variant: 'success' });
            await reload();
          } catch (e) {
            showSnackbar(e instanceof Error ? e.message : t('journey.duplicate_failed'), {
              variant: 'error',
            });
          }
          break;
        case 'add_to_trip':
          showSnackbar(t('journey.trips_coming_soon'), { variant: 'info' });
          break;
        case 'delete':
          handleConfirmDelete(target);
          break;
      }
    },
    [actionFor, handleConfirmDelete, reload, router, showSnackbar, t],
  );

  if (loading && journeys.length === 0) {
    return <LoadingScreen subtitle={t('journey.loading')} />;
  }

  return (
    <View
      className="flex-1 bg-background-light dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <Text className="text-3xl font-bold tracking-tight text-text-dark dark:text-text-light">
          Trazia
        </Text>
        <Pressable
          onPress={() => setFilterOpen(true)}
          className="relative h-10 w-10 items-center justify-center rounded-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark active:opacity-80"
          accessibilityLabel={t('journey.filter_aria')}
        >
          <Ionicons name="options-outline" size={20} color={colors.text.muted} />
          {filterCount > 0 ? (
            <View className="absolute -right-1 -top-1 min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1">
              <Text className="text-[10px] font-bold text-white">{filterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View className="border-b border-border-light dark:border-border-dark px-4 pb-3">
        <View className="flex-row items-center gap-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-3">
          <Ionicons name="search" size={18} color={colors.text.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('journey.search_placeholder')}
            placeholderTextColor={colors.text.muted}
            className="flex-1 py-2.5 text-base text-text-dark dark:text-text-light"
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
          <SwipeableRow
            onDelete={() => handleConfirmDelete(item)}
            deleteLabel={t('journey.delete_label')}
          >
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
                ? t('journey.empty_no_match_title')
                : t('journey.empty_title')
            }
            subtitle={
              isFilterActive(filters) || search.length > 0
                ? t('journey.empty_no_match_subtitle')
                : t('journey.empty_subtitle')
            }
          />
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />
        }
      />

      <View
        className="absolute left-0 right-0"
        style={{ bottom: insets.bottom }}
        pointerEvents="box-none"
      >
        <AdaptiveBannerAd />
      </View>

      <Link href="/journeys/add" asChild>
        <Pressable
          className="absolute right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
          style={{ bottom: 24 + insets.bottom }}
          accessibilityLabel={t('journey.add_aria')}
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

      <PremiumUpsellSheet
        visible={upsell25.visible}
        onClose={upsell25.dismiss}
        title={t('upsell.j25_title')}
        message={t('upsell.j25_message')}
        ctaLabel={t('upsell.j25_cta')}
      />
    </View>
  );
}
