import { forwardRef, useMemo } from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import { greatCirclePath, type LatLng } from '@/lib/geo';
import {
  formatCabin,
  formatDateLong,
  formatDistance,
  formatDuration,
  journeyTitle,
} from '@/lib/journeys/format';
import { colors, modeColors } from '@/theme/colors';

// 1080×1920 (Instagram/TikTok story aspect). Keep it consistent so the
// image renders identically on every device — react-native-view-shot
// captures the View at its declared pixel size, not at device DPR.
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;

// Off-screen container that holds the card mounted in the React tree at
// negative offset. react-native-view-shot can capture views that are
// off-screen as long as they're in the layout tree — this beats the
// alternative of toggling visibility and racing the layout pass.
export const SHARE_CARD_OFFSCREEN_STYLE = {
  position: 'absolute' as const,
  left: -10_000,
  top: -10_000,
  width: SHARE_CARD_WIDTH,
  height: SHARE_CARD_HEIGHT,
};

const TRAZIA_LOGO = require('../../../assets/images/android-icon-foreground.png');

const MAP_PADDING = 80;
const MAP_HEIGHT = 720;
const MAP_INNER_PAD = 60; // px inside the map area kept clear of the route

interface ShareMapProps {
  from: LatLng;
  to: LatLng;
  stroke: string;
  width: number;
  height: number;
}

// Lightweight static great-circle render in plain SVG — way more
// reliable than react-native-maps.takeSnapshot() inside an off-screen
// view (Apple Maps snapshotter fights view-shot in odd ways) and the
// output is crisp at 1080 px because SVG is resolution-independent.
function ShareMap({ from, to, stroke, width, height }: ShareMapProps) {
  const path = useMemo(() => greatCirclePath(from, to, 96), [from, to]);
  const lats = path.map((p) => p.latitude);
  const lngs = path.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padLat = Math.max(2, (maxLat - minLat) * 0.25);
  const padLng = Math.max(2, (maxLng - minLng) * 0.25);
  const left = minLng - padLng;
  const right = maxLng + padLng;
  const bottom = minLat - padLat;
  const top = maxLat + padLat;
  const xScale = (width - MAP_INNER_PAD * 2) / (right - left);
  const yScale = (height - MAP_INNER_PAD * 2) / (top - bottom);
  const project = (lat: number, lng: number) => {
    const x = MAP_INNER_PAD + (lng - left) * xScale;
    // Latitude grows north → invert Y so north is up in the picture.
    const y = MAP_INNER_PAD + (top - lat) * yScale;
    return { x, y };
  };
  const points = path.map((p) => project(p.latitude, p.longitude));
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const start = project(from.latitude, from.longitude);
  const end = project(to.latitude, to.longitude);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={d}
        stroke={stroke}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <SvgCircle cx={start.x} cy={start.y} r={14} fill={stroke} stroke="white" strokeWidth={3} />
      <SvgCircle cx={end.x} cy={end.y} r={14} fill={stroke} stroke="white" strokeWidth={3} />
    </Svg>
  );
}

export interface JourneyShareCardProps {
  journey: JourneyWithRefs;
  /** localised "{name} took a trip" title (already resolved with t()) */
  title: string;
  labels: {
    distance: string;
    duration: string;
    class: string;
    seat: string;
    footer: string;
  };
}

// The actual rendered card. Wrap in <View collapsable={false}> when
// mounting so react-native-view-shot can find the underlying native
// view to snapshot.
export const JourneyShareCard = forwardRef<View, JourneyShareCardProps>(function JourneyShareCard(
  { journey, title, labels },
  ref,
) {
  const { from, to } = journeyTitle(journey);
  const operatorLine = [journey.operator?.name, journey.serviceNumber].filter(Boolean).join(' · ');
  const dateLine = formatDateLong(journey.date);
  const mode = journey.mode as keyof typeof modeColors;
  const stroke = modeColors[mode] ?? colors.primary;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        backgroundColor: '#0A0E1A',
        padding: 80,
      }}
    >
      <View style={{ flex: 0 }}>
        <Text
          style={{
            color: colors.primary,
            fontSize: 36,
            fontWeight: '700',
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}
        >
          Trazia
        </Text>
        <Text
          style={{
            color: '#9CA3AF',
            fontSize: 36,
            marginTop: 12,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>

      <View style={{ marginTop: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 28 }}>
          <Text
            style={{
              color: '#F9FAFB',
              fontSize: 120,
              fontWeight: '800',
              letterSpacing: 4,
            }}
          >
            {from}
          </Text>
          <Text style={{ color: stroke, fontSize: 80, fontWeight: '700' }}>→</Text>
          <Text
            style={{
              color: '#F9FAFB',
              fontSize: 120,
              fontWeight: '800',
              letterSpacing: 4,
            }}
          >
            {to}
          </Text>
        </View>
        {dateLine || operatorLine ? (
          <Text style={{ color: '#9CA3AF', fontSize: 32, marginTop: 24 }}>
            {[dateLine, operatorLine].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          marginTop: 80,
          height: MAP_HEIGHT,
          borderRadius: 32,
          overflow: 'hidden',
          backgroundColor: '#111827',
          borderWidth: 2,
          borderColor: '#1F2937',
        }}
      >
        {journey.fromLocation && journey.toLocation ? (
          <ShareMap
            from={{
              latitude: journey.fromLocation.lat,
              longitude: journey.fromLocation.lng,
            }}
            to={{
              latitude: journey.toLocation.lat,
              longitude: journey.toLocation.lng,
            }}
            stroke={stroke}
            width={SHARE_CARD_WIDTH - MAP_PADDING * 2}
            height={MAP_HEIGHT}
          />
        ) : null}
      </View>

      <View
        style={{
          marginTop: 64,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 24,
        }}
      >
        <ShareStat label={labels.distance} value={formatDistance(journey.distanceKm)} />
        <ShareStat label={labels.duration} value={formatDuration(journey.durationMinutes)} />
        <ShareStat label={labels.class} value={formatCabin(journey.cabinClass)} />
        <ShareStat label={labels.seat} value={journey.seatNumber ?? '—'} />
      </View>

      <View
        style={{
          marginTop: 'auto',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <Image source={TRAZIA_LOGO} style={{ width: 96, height: 96 }} />
        <Text style={{ color: '#9CA3AF', fontSize: 28, fontWeight: '600' }}>
          {labels.footer}
        </Text>
      </View>
    </View>
  );
});

function ShareStat({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        backgroundColor: '#111827',
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#1F2937',
        paddingVertical: 28,
        paddingHorizontal: 36,
      }}
    >
      <Text
        style={{
          color: '#9CA3AF',
          fontSize: 22,
          textTransform: 'uppercase',
          letterSpacing: 3,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: '#F9FAFB',
          fontSize: 56,
          fontWeight: '700',
          marginTop: 8,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
