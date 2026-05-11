import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { getJourneyWithRefsById, type JourneyWithRefs } from '@/db/repositories/journey.repository';
import { achievementUnlocks } from '@/db/schema';
import { eq } from 'drizzle-orm';

import { loadAchievements } from '@/lib/achievements/engine';
import { getLocalizedAchievement } from '@/lib/achievements/localize';
import { tierStyle } from '@/lib/achievements/tier';
import type { Achievement } from '@/lib/achievements/types';
import { formatTimestamp, journeyTitle } from '@/lib/journeys/format';
import { colors } from '@/theme/colors';

interface UnlockRow {
  unlockedAt: Date | null;
  triggeringJourneyId: string | null;
}

async function loadUnlock(achievementId: string): Promise<UnlockRow | null> {
  const rows = await db
    .select()
    .from(achievementUnlocks)
    .where(eq(achievementUnlocks.achievementId, achievementId))
    .limit(1);
  if (!rows[0]) return null;
  return {
    unlockedAt: rows[0].unlockedAt ?? null,
    triggeringJourneyId: rows[0].triggeringJourneyId ?? null,
  };
}

export default function AchievementDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [unlock, setUnlock] = useState<UnlockRow | null>(null);
  const [triggeringJourney, setTriggeringJourney] = useState<JourneyWithRefs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const a = id ? loadAchievements().find((x) => x.id === id) : undefined;
      if (cancelled) return;
      setAchievement(a ?? null);
      if (a) {
        const u = await loadUnlock(a.id);
        if (cancelled) return;
        setUnlock(u);
        if (u?.triggeringJourneyId) {
          const j = await getJourneyWithRefsById(db, u.triggeringJourneyId);
          if (!cancelled) setTriggeringJourney(j ?? null);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!achievement) {
    return (
      <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark px-6">
        <Text className="text-lg text-text-muted-light dark:text-text-muted">
          {t('achievement.not_found')}
        </Text>
      </View>
    );
  }

  const tier = tierStyle(achievement.tier);
  const unlocked = unlock !== null;
  const isHidden = achievement.hidden && !unlocked;
  const localized = getLocalizedAchievement(achievement);

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
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
        }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View
          className="overflow-hidden"
          style={{ paddingTop: insets.top + 60, paddingBottom: 32 }}
        >
          {tier.isGradient ? (
            <LinearGradient
              colors={[tier.primary, tier.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', inset: 0 }}
            />
          ) : (
            <View style={{ position: 'absolute', inset: 0, backgroundColor: tier.primary }} />
          )}
          <View className="items-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-black/40">
              {isHidden ? (
                <Ionicons name="help" size={40} color="white" />
              ) : (
                <Text className="text-5xl">{tier.badge}</Text>
              )}
            </View>
            <Text
              className="mt-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: tier.textOnPrimary }}
            >
              {tier.label}
            </Text>
            <Text
              className="px-6 text-center text-3xl font-bold"
              style={{ color: tier.textOnPrimary }}
            >
              {isHidden ? '???' : localized.title}
            </Text>
            <Text
              className="mt-1 px-8 text-center text-sm"
              style={{ color: tier.textOnPrimary, opacity: 0.85 }}
            >
              {isHidden ? t('achievement.hidden_hint') : localized.description}
            </Text>
          </View>
        </View>

        <View className="mx-4 my-4 rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
            {t('achievement.status')}
          </Text>
          <Text
            className="mt-1 text-base font-semibold"
            style={{ color: unlocked ? colors.success : colors.text.muted }}
          >
            {unlocked ? t('achievement.status_unlocked') : t('achievement.status_locked')}
          </Text>
          {unlocked && unlock?.unlockedAt ? (
            <Text className="mt-1 text-xs text-text-muted-light dark:text-text-muted">
              {t('achievement.unlocked_on', { date: formatTimestamp(unlock.unlockedAt) })}
            </Text>
          ) : null}
        </View>

        {triggeringJourney ? (
          <Link href={{ pathname: '/journeys/[id]', params: { id: triggeringJourney.id } }} asChild>
            <Pressable className="mx-4 flex-row items-center justify-between rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4 active:opacity-80">
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
                  {t('achievement.triggered_by')}
                </Text>
                <Text className="mt-1 text-base font-semibold text-text-dark dark:text-text-light">
                  {journeyTitle(triggeringJourney).from} → {journeyTitle(triggeringJourney).to}
                </Text>
                <Text className="text-xs text-text-muted-light dark:text-text-muted">
                  {triggeringJourney.date}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
            </Pressable>
          </Link>
        ) : null}
      </ScrollView>
    </View>
  );
}
