import type { Ionicons } from '@expo/vector-icons';

import { FEATURE_FLAGS } from '@/config/featureFlags';

export type AddJourneyMode = 'flight' | 'train' | 'car' | 'ship' | 'bus' | 'other';

export interface ModeDef {
  value: AddJourneyMode;
  labelKey: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  enabled: boolean;
  comingIn?: 'Phase 2';
}

// All modes stay defined so existing user-recorded journeys (e.g. train)
// remain editable without crashing — only the visible list passed to the
// picker is filtered for Phase 1. Labels resolve through i18n via labelKey
// at render time so the picker switches with the active locale.
export const ALL_MODES: readonly ModeDef[] = [
  { value: 'flight', labelKey: 'mode.flight', icon: 'airplane', enabled: true },
  {
    value: 'train',
    labelKey: 'mode.train',
    icon: 'train',
    enabled: FEATURE_FLAGS.PHASE_2_TRAIN_VISIBLE,
    comingIn: 'Phase 2',
  },
  { value: 'car', labelKey: 'mode.car', icon: 'car', enabled: false, comingIn: 'Phase 2' },
  { value: 'ship', labelKey: 'mode.ship', icon: 'boat', enabled: false, comingIn: 'Phase 2' },
  { value: 'bus', labelKey: 'mode.bus', icon: 'bus', enabled: false, comingIn: 'Phase 2' },
  { value: 'other', labelKey: 'mode.other', icon: 'ellipsis-horizontal', enabled: true },
];

// Phase-1 product decision: only Flight + Other are visible in the
// picker. No locked-tile teaser for Train/Car/Ship/Bus until those modes
// actually ship.
export const PHASE_1_VISIBLE_MODES: readonly ModeDef[] = ALL_MODES.filter(
  (m) => m.value === 'flight' || m.value === 'other',
);

// Backwards-compatible alias used throughout the codebase. The picker
// renders this list; tests can import ALL_MODES to assert the full set
// remains available for editing existing data.
export const MODES: readonly ModeDef[] = PHASE_1_VISIBLE_MODES;
