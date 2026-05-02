import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import { colors, modeColors } from '@/theme/colors';

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDistance = (km: number | null): string => {
  if (km === null || !Number.isFinite(km)) return '—';
  if (km >= 100) return `${Math.round(km).toLocaleString('de-DE')} km`;
  return `${km.toFixed(1)} km`;
};

const formatDuration = (minutes: number | null): string => {
  if (minutes === null || !Number.isFinite(minutes)) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
};

export interface JourneyCardProps {
  journey: JourneyWithRefs;
  onPress?: (journey: JourneyWithRefs) => void;
  onLongPress?: (journey: JourneyWithRefs) => void;
}

const FlightCardBody = memo(function FlightCardBody({ journey }: { journey: JourneyWithRefs }) {
  const fromCode = journey.fromLocation?.iata ?? journey.fromLocation?.icao ?? '???';
  const toCode = journey.toLocation?.iata ?? journey.toLocation?.icao ?? '???';
  const operatorCode = journey.operator?.code ?? journey.operator?.name?.slice(0, 2) ?? '??';

  return (
    <>
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: `${modeColors.flight}33` }}
      >
        <Text className="text-xs font-bold" style={{ color: modeColors.flight }}>
          {operatorCode.toUpperCase()}
        </Text>
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold tracking-wider text-text-light">{fromCode}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.text.muted} />
          <Text className="text-lg font-bold tracking-wider text-text-light">{toCode}</Text>
        </View>
        <Text className="text-xs text-text-muted">
          {[journey.serviceNumber, formatDate(journey.date)].filter(Boolean).join(' · ')}
        </Text>
        <Text className="text-xs text-text-muted">
          {[formatDistance(journey.distanceKm), formatDuration(journey.durationMinutes)]
            .filter((v) => v !== '—')
            .join(' · ') || '—'}
        </Text>
      </View>
    </>
  );
});

const TrainCardBody = memo(function TrainCardBody({ journey }: { journey: JourneyWithRefs }) {
  const fromName = journey.fromLocation?.city ?? journey.fromLocation?.name ?? '?';
  const toName = journey.toLocation?.city ?? journey.toLocation?.name ?? '?';
  const opCode = journey.operator?.code ?? journey.operator?.name?.slice(0, 2) ?? '🚆';
  return (
    <>
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: `${modeColors.train}33` }}
      >
        <Text className="text-xs font-bold" style={{ color: modeColors.train }}>
          {opCode.toUpperCase()}
        </Text>
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold tracking-tight text-text-light" numberOfLines={1}>
            {fromName}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={colors.text.muted} />
          <Text className="text-base font-bold tracking-tight text-text-light" numberOfLines={1}>
            {toName}
          </Text>
        </View>
        <Text className="text-xs text-text-muted">
          {[journey.serviceNumber, formatDate(journey.date)].filter(Boolean).join(' · ')}
        </Text>
        <Text className="text-xs text-text-muted">
          {[formatDistance(journey.distanceKm), formatDuration(journey.durationMinutes)]
            .filter((v) => v !== '—')
            .join(' · ') || '—'}
        </Text>
      </View>
    </>
  );
});

const GenericCardBody = memo(function GenericCardBody({
  journey,
  iconName,
  modeColor,
}: {
  journey: JourneyWithRefs;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  modeColor: string;
}) {
  const fromName = journey.fromLocation?.name ?? '?';
  const toName = journey.toLocation?.name ?? '?';
  return (
    <>
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: `${modeColor}33` }}
      >
        <Ionicons name={iconName} size={20} color={modeColor} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-text-light" numberOfLines={1}>
          {fromName} → {toName}
        </Text>
        <Text className="text-xs text-text-muted">{formatDate(journey.date)}</Text>
        <Text className="text-xs text-text-muted">
          {[formatDistance(journey.distanceKm), formatDuration(journey.durationMinutes)]
            .filter((v) => v !== '—')
            .join(' · ') || '—'}
        </Text>
      </View>
    </>
  );
});

export const JourneyCard = memo(function JourneyCard({
  journey,
  onPress,
  onLongPress,
}: JourneyCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(journey)}
      onLongPress={() => onLongPress?.(journey)}
      delayLongPress={400}
      className="mx-4 my-1.5 flex-row items-center gap-3 rounded-2xl border border-border-dark bg-surface-dark px-3 py-3 active:opacity-80"
    >
      {journey.mode === 'flight' ? (
        <FlightCardBody journey={journey} />
      ) : journey.mode === 'train' ? (
        <TrainCardBody journey={journey} />
      ) : journey.mode === 'car' ? (
        // TODO Phase 2: replace with shortened address strings + odometer
        // delta when GPS / vehicle telemetry is wired.
        <GenericCardBody journey={journey} iconName="car" modeColor={modeColors.car} />
      ) : journey.mode === 'ship' ? (
        // TODO Phase 2: replace with shipping-line logo + UN/LOCODEs.
        <GenericCardBody journey={journey} iconName="boat" modeColor={modeColors.ship} />
      ) : journey.mode === 'walk' ? (
        <GenericCardBody journey={journey} iconName="walk" modeColor={modeColors.other} />
      ) : journey.mode === 'bike' ? (
        <GenericCardBody journey={journey} iconName="bicycle" modeColor={modeColors.other} />
      ) : (
        <GenericCardBody
          journey={journey}
          iconName="ellipsis-horizontal"
          modeColor={modeColors.other}
        />
      )}

      <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
    </Pressable>
  );
});
