import type { Ionicons } from '@expo/vector-icons';

import { FEATURE_FLAGS } from '@/config/featureFlags';

export type AddJourneyMode = 'flight' | 'train' | 'car' | 'ship' | 'bus' | 'other';

export interface ModeDef {
  value: AddJourneyMode;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  enabled: boolean;
  comingIn?: 'Phase 2';
}

// Phase-1 launch hides Train; the code path stays in the bundle so
// existing user-recorded train journeys still show read-only and the
// engine keeps cross-mode achievements correct. Flip the feature flag
// in src/config/featureFlags.ts to re-enable.
export const MODES: readonly ModeDef[] = [
  { value: 'flight', label: 'Flug', icon: 'airplane', enabled: true },
  {
    value: 'train',
    label: 'Zug',
    icon: 'train',
    enabled: FEATURE_FLAGS.PHASE_2_TRAIN_VISIBLE,
    comingIn: 'Phase 2',
  },
  { value: 'car', label: 'Auto', icon: 'car', enabled: false, comingIn: 'Phase 2' },
  { value: 'ship', label: 'Schiff', icon: 'boat', enabled: false, comingIn: 'Phase 2' },
  { value: 'bus', label: 'Bus', icon: 'bus', enabled: false, comingIn: 'Phase 2' },
  { value: 'other', label: 'Sonstiges', icon: 'ellipsis-horizontal', enabled: true },
];
