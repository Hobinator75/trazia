import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import { topRoutes } from '@/lib/stats';
import { colors } from '@/theme/colors';

export interface TopRoutesCardProps {
  journeys: JourneyWithRefs[];
}

const codeOf = (
  location: { iata?: string | null; icao?: string | null; name?: string | null } | null | undefined,
): string => location?.iata ?? location?.icao ?? location?.name ?? '?';

export function TopRoutesCard({ journeys }: TopRoutesCardProps) {
  const routes = topRoutes(journeys, 5);
  if (routes.length === 0) {
    return (
      <View className="mx-4 my-3 rounded-3xl border border-border-dark bg-surface-dark p-5">
        <Text className="text-sm text-text-muted">Noch keine Routen erfasst.</Text>
      </View>
    );
  }

  const labels = new Map<string, string>();
  for (const j of journeys) {
    if (j.fromLocation) labels.set(j.fromLocation.id, codeOf(j.fromLocation));
    if (j.toLocation) labels.set(j.toLocation.id, codeOf(j.toLocation));
  }

  return (
    <View className="mx-4 my-3 rounded-3xl border border-border-dark bg-surface-dark">
      <View className="border-b border-border-dark px-5 py-3">
        <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Top Routen
        </Text>
      </View>
      {routes.map((r, idx) => (
        <View
          key={`${r.from}-${r.to}`}
          className={`flex-row items-center gap-3 px-5 py-3 ${idx > 0 ? 'border-t border-border-dark' : ''}`}
        >
          <Text className="w-6 text-base font-bold text-text-muted">{idx + 1}</Text>
          <View className="flex-1 flex-row items-center gap-2">
            <Text className="text-base font-bold tracking-wider text-text-light">
              {labels.get(r.from) ?? r.from}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.text.muted} />
            <Text className="text-base font-bold tracking-wider text-text-light">
              {labels.get(r.to) ?? r.to}
            </Text>
          </View>
          <Text className="text-sm text-text-muted">{r.count}×</Text>
        </View>
      ))}
    </View>
  );
}
