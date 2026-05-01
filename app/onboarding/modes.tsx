import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboardingStore } from '@/stores/onboardingStore';
import { colors } from '@/theme/colors';
import type { TransportMode } from '@/types/domain-types';

interface ModeOption {
  id: TransportMode | 'bus';
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  enabled: boolean;
}

const OPTIONS: ModeOption[] = [
  { id: 'flight', label: 'Flüge', icon: 'airplane', enabled: true },
  { id: 'train', label: 'Züge', icon: 'train', enabled: false },
  { id: 'car', label: 'Auto', icon: 'car', enabled: false },
  { id: 'ship', label: 'Schiff', icon: 'boat', enabled: false },
  { id: 'bus', label: 'Bus', icon: 'bus', enabled: false },
];

export default function OnboardingModesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setSelectedModes = useOnboardingStore((s) => s.setSelectedModes);
  const initial = useOnboardingStore.getState().selectedModes;
  const [selected, setSelected] = useState<Set<TransportMode>>(new Set(initial));

  const toggle = (option: ModeOption) => {
    if (!option.enabled) return;
    const next = new Set(selected);
    if (next.has(option.id as TransportMode)) {
      next.delete(option.id as TransportMode);
    } else {
      next.add(option.id as TransportMode);
    }
    setSelected(next);
  };

  const handleContinue = () => {
    setSelectedModes([...selected]);
    router.push('/onboarding/first-journey');
  };

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-1 px-6">
        <Text className="mt-4 text-3xl font-bold text-text-light">Was möchtest du tracken?</Text>
        <Text className="mt-2 text-base text-text-muted">
          Aktiviere die Modi, die du nutzen willst. Mehr ist später jederzeit möglich.
        </Text>

        <View className="mt-6 gap-3">
          {OPTIONS.map((option) => {
            const isOn = selected.has(option.id as TransportMode);
            const isDisabled = !option.enabled;
            return (
              <Pressable
                key={option.id}
                onPress={() => toggle(option)}
                disabled={isDisabled}
                className={`flex-row items-center gap-3 rounded-2xl border-2 px-4 py-4 ${
                  isOn
                    ? 'border-primary bg-primary/15'
                    : isDisabled
                      ? 'border-border-dark bg-surface-dark/40 opacity-60'
                      : 'border-border-dark bg-surface-dark active:opacity-80'
                }`}
              >
                {isDisabled ? (
                  <Ionicons name="lock-closed" size={16} color={colors.text.muted} />
                ) : null}
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={isOn ? colors.primary : colors.text.muted}
                />
                <Text
                  className={`flex-1 text-base font-semibold ${
                    isOn ? 'text-primary' : 'text-text-light'
                  }`}
                >
                  {option.label}
                </Text>
                {isDisabled ? (
                  <Text className="text-xs text-text-muted">Phase 2</Text>
                ) : isOn ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text className="mt-6 text-xs text-text-muted">
          Spätere Modi werden automatisch freigeschaltet, sobald sie verfügbar sind.
        </Text>
      </View>

      <View className="px-6" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleContinue}
          className="items-center rounded-full bg-primary py-4 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">Weiter</Text>
        </Pressable>
      </View>
    </View>
  );
}
