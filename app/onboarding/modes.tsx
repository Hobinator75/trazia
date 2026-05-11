import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboardingStore } from '@/stores/onboardingStore';
import { colors } from '@/theme/colors';
import type { TransportMode } from '@/types/domain-types';

interface ModeOption {
  id: TransportMode;
  labelKey: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

// Phase-1 product decision: only Flight + Other are shown. Train/Car/
// Ship/Bus are not surfaced in the UI at all (no locked-tile teaser),
// because showing them would mislead first-run users about what they
// can actually log today.
const OPTIONS: ModeOption[] = [
  { id: 'flight', labelKey: 'onboarding.modes.flight', icon: 'airplane' },
  { id: 'other', labelKey: 'onboarding.modes.other', icon: 'ellipsis-horizontal' },
];

export default function OnboardingModesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const setSelectedModes = useOnboardingStore((s) => s.setSelectedModes);
  const initial = useOnboardingStore.getState().selectedModes;
  const [selected, setSelected] = useState<Set<TransportMode>>(new Set(initial));

  const toggle = (option: ModeOption) => {
    const next = new Set(selected);
    if (next.has(option.id)) {
      next.delete(option.id);
    } else {
      next.add(option.id);
    }
    setSelected(next);
  };

  const handleContinue = () => {
    setSelectedModes([...selected]);
    router.push('/onboarding/first-journey');
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-1 px-6">
        <Text className="mt-4 text-3xl font-bold text-text-dark dark:text-text-light">
          {t('onboarding.modes.title')}
        </Text>
        <Text className="mt-2 text-base text-text-muted-light dark:text-text-muted">{t('onboarding.modes.subtitle')}</Text>

        <View className="mt-6 gap-3">
          {OPTIONS.map((option) => {
            const isOn = selected.has(option.id);
            return (
              <Pressable
                key={option.id}
                onPress={() => toggle(option)}
                className={`flex-row items-center gap-3 rounded-2xl border-2 px-4 py-4 ${
                  isOn
                    ? 'border-primary bg-primary/15'
                    : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark active:opacity-80'
                }`}
              >
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={isOn ? colors.primary : colors.text.muted}
                />
                <Text
                  className={`flex-1 text-base font-semibold ${
                    isOn ? 'text-primary' : 'text-text-dark dark:text-text-light'
                  }`}
                >
                  {t(option.labelKey)}
                </Text>
                {isOn ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text className="mt-6 text-xs text-text-muted-light dark:text-text-muted">
          {t('onboarding.modes.later_unlocks')}
        </Text>
      </View>

      <View className="px-6" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleContinue}
          className="items-center rounded-full bg-primary py-4 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">{t('onboarding.modes.cta')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
