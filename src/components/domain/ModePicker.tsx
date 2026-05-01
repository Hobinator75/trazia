import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text } from 'react-native';

import { colors } from '@/theme/colors';

export type AddJourneyMode = 'flight' | 'train' | 'car' | 'ship' | 'bus' | 'other';

interface ModeDef {
  value: AddJourneyMode;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  enabled: boolean;
  comingIn?: 'Phase 2';
}

export const MODES: readonly ModeDef[] = [
  { value: 'flight', label: 'Flug', icon: 'airplane', enabled: true },
  { value: 'train', label: 'Zug', icon: 'train', enabled: false, comingIn: 'Phase 2' },
  { value: 'car', label: 'Auto', icon: 'car', enabled: false, comingIn: 'Phase 2' },
  { value: 'ship', label: 'Schiff', icon: 'boat', enabled: false, comingIn: 'Phase 2' },
  { value: 'bus', label: 'Bus', icon: 'bus', enabled: false, comingIn: 'Phase 2' },
  { value: 'other', label: 'Sonstiges', icon: 'ellipsis-horizontal', enabled: true },
];

export interface ModePickerProps {
  value: AddJourneyMode;
  onChange: (mode: AddJourneyMode) => void;
  onLockedTap?: (mode: AddJourneyMode) => void;
}

export function ModePicker({ value, onChange, onLockedTap }: ModePickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      className="py-3"
    >
      {MODES.map((mode) => {
        const isActive = value === mode.value;
        const isDisabled = !mode.enabled;
        return (
          <Pressable
            key={mode.value}
            onPress={() => {
              if (isDisabled) onLockedTap?.(mode.value);
              else onChange(mode.value);
            }}
            className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${
              isActive
                ? 'border-primary bg-primary/20'
                : isDisabled
                  ? 'border-border-dark bg-surface-dark/40 opacity-50'
                  : 'border-border-dark bg-surface-dark'
            }`}
          >
            {isDisabled ? (
              <Ionicons name="lock-closed" size={14} color={colors.text.muted} />
            ) : null}
            <Ionicons
              name={mode.icon}
              size={16}
              color={isActive ? colors.primary : colors.text.muted}
            />
            <Text
              className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-text-light'}`}
            >
              {mode.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
