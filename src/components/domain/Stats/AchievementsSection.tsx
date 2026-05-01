import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { loadAchievements } from '@/lib/achievements/engine';
import type { Achievement, AchievementCategory } from '@/lib/achievements/types';

import { AchievementCard } from '../Achievements/AchievementCard';

const CATEGORY_ORDER: { id: AchievementCategory; label: string }[] = [
  { id: 'milestones', label: 'Meilensteine' },
  { id: 'geography', label: 'Geografie' },
  { id: 'distance', label: 'Distanz' },
  { id: 'airlines', label: 'Airlines' },
  { id: 'aircraft', label: 'Aircraft' },
  { id: 'hidden', label: 'Versteckt' },
  { id: 'premium', label: 'Premium' },
];

export interface AchievementsSectionProps {
  unlockedIds: Set<string>;
  unlockedAtById: Map<string, Date | null>;
}

interface CategoryGroup {
  id: AchievementCategory;
  label: string;
  achievements: Achievement[];
}

function bucketByCategory(achievements: Achievement[], unlockedIds: Set<string>): CategoryGroup[] {
  const groups = new Map<AchievementCategory, Achievement[]>();
  for (const a of achievements) {
    const cat = a.category ?? (a.hidden ? 'hidden' : 'milestones');
    const list = groups.get(cat) ?? [];
    list.push(a);
    groups.set(cat, list);
  }

  const out: CategoryGroup[] = [];
  for (const meta of CATEGORY_ORDER) {
    const list = groups.get(meta.id);
    if (!list || list.length === 0) continue;
    const visible = meta.id === 'hidden' ? list.filter((a) => unlockedIds.has(a.id)) : list;
    if (visible.length === 0) continue;
    out.push({ id: meta.id, label: meta.label, achievements: visible });
  }
  return out;
}

export function AchievementsSection({ unlockedIds, unlockedAtById }: AchievementsSectionProps) {
  const router = useRouter();
  const achievements = useMemo(() => loadAchievements(), []);
  const groups = useMemo(
    () => bucketByCategory(achievements, unlockedIds),
    [achievements, unlockedIds],
  );

  // Total counts ignore hidden-locked achievements so the visible "X von Y"
  // stays honest even before any of the secret ones unlock.
  const totalVisible = achievements.filter((a) => !(a.hidden && !unlockedIds.has(a.id))).length;

  return (
    <View className="mx-4 my-3">
      <View className="mb-3 flex-row items-baseline justify-between">
        <Text className="text-lg font-bold text-text-light">Erfolge</Text>
        <Text className="text-xs text-text-muted">
          {unlockedIds.size} von {totalVisible} freigeschaltet
        </Text>
      </View>

      {groups.map((group) => (
        <View key={group.id} className="mb-5">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {group.label}
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {group.achievements.map((a) => (
              <View key={a.id} style={{ width: '31%' }}>
                <AchievementCard
                  achievement={a}
                  unlocked={unlockedIds.has(a.id)}
                  unlockedAt={unlockedAtById.get(a.id) ?? null}
                  onPress={() =>
                    router.push({
                      pathname: '/stats/achievement/[id]',
                      params: { id: a.id },
                    })
                  }
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
