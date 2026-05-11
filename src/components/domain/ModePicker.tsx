import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text } from 'react-native';

import { colors } from '@/theme/colors';

import { MODES, type AddJourneyMode } from './modePickerConfig';

export { MODES };
export type { AddJourneyMode };

export interface ModePickerProps {
  value: AddJourneyMode;
  onChange: (mode: AddJourneyMode) => void;
  onLockedTap?: (mode: AddJourneyMode) => void;
}

export function ModePicker({ value, onChange, onLockedTap }: ModePickerProps) {
  const { t } = useTranslation();
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
                  ? 'border-border-light dark:border-border-dark bg-surface-light/60 dark:bg-surface-dark/40 opacity-50'
                  : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark'
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
              className={`text-sm font-medium ${
                isActive ? 'text-primary' : 'text-text-dark dark:text-text-light'
              }`}
            >
              {t(mode.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
