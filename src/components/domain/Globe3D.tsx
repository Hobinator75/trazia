import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { Dimensions, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import { greatCirclePath, type LatLng } from '@/lib/geo';
import { colors, modeColors } from '@/theme/colors';

// PHASE-1 PLACEHOLDER ─────────────────────────────────────────────────────
// A real three.js / @react-three/fiber + expo-gl globe with NASA Visible
// Earth textures, atmospheric glow shader, cloud layer and pinch-to-zoom is
// tracked as CC-3.5 follow-up. This stylised SVG version keeps the screen
// visually intentional today: a rotating "earth" disk with great-circle arcs
// drawn from each journey, projected with simple longitude rotation.
// Pros: no native deps, no asset bundling, no GL context to debug; perf is
// fine for hundreds of journeys (each route is <=64 line segments).
// Cons: it is a 2.5D illusion — there is no real sphere, no occlusion of
// the back hemisphere. The toggle will swap this out for the real 3D
// implementation once that lands.
// ─────────────────────────────────────────────────────────────────────────

const ROTATION_PERIOD_MS = 60_000;
const POINTS_PER_ARC = 48;

interface Globe3DProps {
  journeys: JourneyWithRefs[];
}

interface ProjectedArc {
  id: string;
  d: string;
  color: string;
}

function project(latitude: number, longitude: number, radius: number, rotationDeg: number) {
  const lambda = ((longitude + rotationDeg + 540) % 360) - 180;
  const phi = latitude;
  const lambdaRad = (lambda * Math.PI) / 180;
  const phiRad = (phi * Math.PI) / 180;
  const x = radius * Math.cos(phiRad) * Math.sin(lambdaRad);
  const y = -radius * Math.sin(phiRad);
  const z = Math.cos(phiRad) * Math.cos(lambdaRad);
  return { x, y, visible: z > -0.05 };
}

function projectPath(path: LatLng[], radius: number, rotationDeg: number): string | null {
  let d = '';
  let started = false;
  for (const point of path) {
    const p = project(point.latitude, point.longitude, radius, rotationDeg);
    if (!p.visible) {
      started = false;
      continue;
    }
    if (!started) {
      d += `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
      started = true;
    } else {
      d += `L ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
    }
  }
  return d.length > 0 ? d : null;
}

export function Globe3D({ journeys }: Globe3DProps) {
  const { width, height } = Dimensions.get('window');
  const size = Math.min(width, height) - 64;
  const radius = size / 2;

  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: ROTATION_PERIOD_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  // Pre-compute great-circle paths once per journey set; reproject them
  // each frame against the live rotation value.
  const paths: { id: string; color: string; points: LatLng[] }[] = useMemo(
    () =>
      journeys
        .filter((j) => j.fromLocation && j.toLocation)
        .map((j) => ({
          id: j.id,
          color: (modeColors[j.mode as keyof typeof modeColors] ?? colors.primary) as string,
          points: greatCirclePath(
            { latitude: j.fromLocation!.lat, longitude: j.fromLocation!.lng },
            { latitude: j.toLocation!.lat, longitude: j.toLocation!.lng },
            POINTS_PER_ARC,
          ),
        })),
    [journeys],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotation.value}deg` }],
  }));

  // The arcs themselves don't use shared values directly — re-rendering the
  // SVG each frame is fine for this scale (50-200 arcs). For 500+ arcs the
  // batching TODO below applies.
  const projectedArcs: ProjectedArc[] = useMemo(
    () =>
      paths
        .map((p) => {
          const d = projectPath(p.points, radius * 0.95, 0);
          return d ? { id: p.id, d, color: p.color } : null;
        })
        .filter((x): x is ProjectedArc => x !== null),
    [paths, radius],
  );

  return (
    <View className="flex-1 items-center justify-center bg-background-dark">
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={['#1E40AF', '#0B1B3F', '#06121F']}
          start={{ x: 0.3, y: 0.2 }}
          end={{ x: 0.8, y: 0.9 }}
          style={{ flex: 1 }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={size} height={size} viewBox={`${-radius} ${-radius} ${size} ${size}`}>
            <Circle r={radius * 0.95} fill="transparent" stroke="#3B82F622" strokeWidth={1} />
            {projectedArcs.map((arc) => (
              <Path
                key={arc.id}
                d={arc.d}
                stroke={arc.color}
                strokeWidth={1.5}
                fill="none"
                opacity={0.85}
              />
            ))}
          </Svg>
        </View>
      </Animated.View>

      <Text className="mt-6 px-6 text-center text-xs text-text-muted">
        3D-Globus mit Earth-Textur + Atmosphäre kommt in CC-3.5.
      </Text>
    </View>
  );
}

// TODO CC-3.5: real 3D globe
// 1. Install three, @react-three/fiber, expo-gl, expo-asset.
// 2. Bundle Earth day-map (NASA Visible Earth, public domain) +
//    cloud-map + bump-map under assets/textures/.
// 3. Render a Sphere mesh with MeshStandardMaterial + cloud layer
//    rotating ~5x slower than earth.
// 4. Add atmosphere via a slightly-bigger inverted sphere with a custom
//    fragment shader for rim glow.
// 5. Replace the current SVG arcs with TubeGeometry along the same
//    great-circle points; use AdditiveBlending for glow.
// 6. Pinch-to-zoom + drag-to-rotate via Gesture.Pan / Pinch into a
//    quaternion on the camera/group; auto-rotate after 5s idle.
// 7. Performance: at >50 journeys batch arcs into a single
//    BufferGeometry; at >200 reduce POINTS_PER_ARC to 24.
