/* eslint-disable react/no-unknown-property -- r3f intrinsics use Three.js prop names not known to React's DOM type rule */
import { Canvas, useFrame, useLoader, type ThreeEvent } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as THREE from 'three';

import type { JourneyWithRefs } from '@/db/repositories/journey.repository';
import { useResolvedScheme } from '@/hooks/useResolvedScheme';
import { greatCirclePath, type LatLng } from '@/lib/geo';
import { latLngToVec3 } from '@/lib/geo/sphere';
import { colors, modeColors, type ResolvedScheme } from '@/theme/colors';

const EARTH_TEXTURE_MODULE = require('../../../assets/textures/earth-day.jpg');

const SPHERE_RADIUS = 1;
const ROUTE_RADIUS = 1.005;
const ATMOSPHERE_RADIUS = 1.05;
const TUBE_RADIUS = 0.005;
const POINTS_PER_ARC = 48;

const AUTO_ROTATE_RAD_PER_FRAME = 0.005;
const PAN_SENSITIVITY = 0.005;
const PAN_MAX_PITCH = 1.2;
const RESUME_AUTO_ROTATE_AFTER_MS = 3000;

interface Globe3DProps {
  journeys: JourneyWithRefs[];
}

interface RoutePayload {
  id: string;
  color: string;
  curve: THREE.CatmullRomCurve3;
}

interface InteractionState {
  autoRotate: boolean;
  dragging: boolean;
  pendingRotY: number;
  pendingRotX: number;
}

function buildRoutes(journeys: JourneyWithRefs[]): RoutePayload[] {
  const routes: RoutePayload[] = [];
  for (const journey of journeys) {
    if (!journey.fromLocation || !journey.toLocation) continue;
    const from: LatLng = {
      latitude: journey.fromLocation.lat,
      longitude: journey.fromLocation.lng,
    };
    const to: LatLng = {
      latitude: journey.toLocation.lat,
      longitude: journey.toLocation.lng,
    };
    const path = greatCirclePath(from, to, POINTS_PER_ARC);
    if (path.length < 2) continue;

    const points: THREE.Vector3[] = [];
    for (const p of path) {
      const v = latLngToVec3(p.latitude, p.longitude, ROUTE_RADIUS);
      points.push(new THREE.Vector3(v.x, v.y, v.z));
    }

    routes.push({
      id: journey.id,
      color: (modeColors[journey.mode as keyof typeof modeColors] ?? colors.primary) as string,
      curve: new THREE.CatmullRomCurve3(points),
    });
  }
  return routes;
}

function Earth({ textureUri }: { textureUri: string }) {
  const texture = useLoader(THREE.TextureLoader, textureUri) as THREE.Texture;

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  }, [texture]);

  return (
    <mesh>
      <sphereGeometry args={[SPHERE_RADIUS, 64, 32]} />
      <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
    </mesh>
  );
}

// Inverted-sphere fresnel rim glow. The fragment intensity peaks at the
// sphere's silhouette and fades toward the side facing the camera, which
// reads as a soft blue atmosphere. In light mode the rim shifts to a
// darker slate-blue with a lower intensity scalar — full primary blue
// looks ghostly against the light background.
function Atmosphere({ scheme }: { scheme: ResolvedScheme }) {
  const material = useMemo(() => {
    const tint = scheme === 'dark' ? new THREE.Color(colors.primary) : new THREE.Color('#1E3A8A');
    const intensityScale = scheme === 'dark' ? 1.0 : 0.55;
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        glowColor: { value: tint },
        intensityScale: { value: intensityScale },
      },
      vertexShader: /* glsl */ `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
      fragmentShader: /* glsl */ `
          varying vec3 vNormal;
          uniform vec3 glowColor;
          uniform float intensityScale;
          void main() {
            float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
            gl_FragColor = vec4(glowColor, 1.0) * intensity * intensityScale;
          }
        `,
    });
  }, [scheme]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh>
      <sphereGeometry args={[ATMOSPHERE_RADIUS, 64, 32]} />
      <primitive attach="material" object={material} />
    </mesh>
  );
}

interface JourneyTubeProps {
  route: RoutePayload;
  opacity: number;
  onTap: (journeyId: string) => void;
}

function JourneyTube({ route, opacity, onTap }: JourneyTubeProps) {
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onTap(route.id);
  };

  return (
    <mesh onClick={handleClick}>
      <tubeGeometry args={[route.curve, 64, TUBE_RADIUS, 8, false]} />
      <meshBasicMaterial color={route.color} transparent opacity={opacity} />
    </mesh>
  );
}

interface SceneProps {
  routes: RoutePayload[];
  textureUri: string;
  scheme: ResolvedScheme;
  interaction: React.MutableRefObject<InteractionState>;
  onTap: (journeyId: string) => void;
}

function Scene({ routes, textureUri, scheme, interaction, onTap }: SceneProps) {
  const tubeOpacity = scheme === 'dark' ? 0.85 : 0.7;
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const state = interaction.current;

    if (state.pendingRotY !== 0 || state.pendingRotX !== 0) {
      group.rotation.y += state.pendingRotY;
      group.rotation.x += state.pendingRotX;
      state.pendingRotY = 0;
      state.pendingRotX = 0;
    } else if (state.autoRotate && !state.dragging) {
      group.rotation.y += AUTO_ROTATE_RAD_PER_FRAME;
    }

    if (group.rotation.x > PAN_MAX_PITCH) group.rotation.x = PAN_MAX_PITCH;
    else if (group.rotation.x < -PAN_MAX_PITCH) group.rotation.x = -PAN_MAX_PITCH;
  });

  return (
    <group ref={groupRef}>
      <Earth textureUri={textureUri} />
      <Atmosphere scheme={scheme} />
      {routes.map((r) => (
        <JourneyTube key={r.id} route={r} opacity={tubeOpacity} onTap={onTap} />
      ))}
    </group>
  );
}

export function Globe3D({ journeys }: Globe3DProps) {
  const router = useRouter();
  const scheme = useResolvedScheme();
  const [textureUri, setTextureUri] = useState<string | null>(null);
  const [textureError, setTextureError] = useState<string | null>(null);

  const interaction = useRef<InteractionState>({
    autoRotate: true,
    dragging: false,
    pendingRotY: 0,
    pendingRotX: 0,
  });
  const lastPan = useRef({ x: 0, y: 0 });
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Asset.fromModule(EARTH_TEXTURE_MODULE)
      .downloadAsync()
      .then((asset) => {
        if (cancelled) return;
        const uri = asset.localUri ?? asset.uri;
        if (!uri) {
          setTextureError('Earth-Texture konnte nicht aufgelöst werden.');
          return;
        }
        // One-frame deferral so the GLView is ready before TextureLoader runs.
        // Without this, the first texture upload occasionally races the GL
        // context init in expo-gl + reanimated builds.
        setTimeout(() => {
          if (!cancelled) setTextureUri(uri);
        }, 0);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setTextureError(err instanceof Error ? err.message : 'Texture-Load fehlgeschlagen.');
        }
      });
    return () => {
      cancelled = true;
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  const routes = useMemo(() => buildRoutes(journeys), [journeys]);

  const handleTap = (journeyId: string) => {
    router.push({ pathname: '/journeys/[id]', params: { id: journeyId } });
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin(() => {
          interaction.current.dragging = true;
          interaction.current.autoRotate = false;
          lastPan.current = { x: 0, y: 0 };
          if (resumeTimer.current) {
            clearTimeout(resumeTimer.current);
            resumeTimer.current = null;
          }
        })
        .onUpdate((e) => {
          const dx = e.translationX - lastPan.current.x;
          const dy = e.translationY - lastPan.current.y;
          interaction.current.pendingRotY += dx * PAN_SENSITIVITY;
          interaction.current.pendingRotX += dy * PAN_SENSITIVITY;
          lastPan.current = { x: e.translationX, y: e.translationY };
        })
        .onEnd(() => {
          interaction.current.dragging = false;
          if (resumeTimer.current) clearTimeout(resumeTimer.current);
          resumeTimer.current = setTimeout(() => {
            interaction.current.autoRotate = true;
            resumeTimer.current = null;
          }, RESUME_AUTO_ROTATE_AFTER_MS);
        }),
    [],
  );

  if (textureError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark p-6">
        <Text className="text-center text-sm text-danger">{textureError}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <GestureDetector gesture={pan}>
        <View style={{ flex: 1 }}>
          <Canvas
            camera={{ position: [0, 0, 2.6], fov: 50, near: 0.1, far: 100 }}
            gl={{ antialias: true }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 3, 5]} intensity={1} />
            {textureUri ? (
              <Suspense fallback={null}>
                <Scene
                  routes={routes}
                  textureUri={textureUri}
                  scheme={scheme}
                  interaction={interaction}
                  onTap={handleTap}
                />
              </Suspense>
            ) : null}
          </Canvas>
        </View>
      </GestureDetector>

      {!textureUri ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}
