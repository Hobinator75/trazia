import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TransportMode } from '@/types/domain-types';
import { colors } from '@/theme/colors';

export interface JourneyFilters {
  modes: TransportMode[];
  years: number[];
  operatorIds: string[];
  countries: string[];
}

export const EMPTY_FILTERS: JourneyFilters = {
  modes: [],
  years: [],
  operatorIds: [],
  countries: [],
};

export const isFilterActive = (f: JourneyFilters): boolean =>
  f.modes.length + f.years.length + f.operatorIds.length + f.countries.length > 0;

export interface FilterOption {
  id: string;
  label: string;
}

export interface JourneyFilterSheetProps {
  visible: boolean;
  filters: JourneyFilters;
  onChange: (next: JourneyFilters) => void;
  onClose: () => void;
  modeOptions: FilterOption[];
  yearOptions: number[];
  operatorOptions: FilterOption[];
  countryOptions: FilterOption[];
}

function Pill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-2 ${
        selected ? 'border-primary bg-primary/20' : 'border-border-dark bg-background-dark'
      }`}
    >
      <Text className={`text-sm ${selected ? 'text-primary' : 'text-text-light'}`}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

export function JourneyFilterSheet({
  visible,
  filters,
  onChange,
  onClose,
  modeOptions,
  yearOptions,
  operatorOptions,
  countryOptions,
}: JourneyFilterSheetProps) {
  const insets = useSafeAreaInsets();

  const toggle = <K extends keyof JourneyFilters>(key: K, value: JourneyFilters[K][number]) => {
    const list = filters[key] as readonly unknown[];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    onChange({ ...filters, [key]: next } as JourneyFilters);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View
          className="rounded-t-3xl bg-surface-dark"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-center justify-between border-b border-border-dark px-4 py-3">
            <Text className="text-lg font-semibold text-text-light">Filter</Text>
            <View className="flex-row gap-3">
              <Pressable onPress={() => onChange(EMPTY_FILTERS)} hitSlop={8}>
                <Text className="text-sm text-primary">Reset</Text>
              </Pressable>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.text.light} />
              </Pressable>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }} className="max-h-[70vh]">
            {modeOptions.length > 0 ? (
              <Section title="Modus">
                {modeOptions.map((opt) => (
                  <Pill
                    key={opt.id}
                    label={opt.label}
                    selected={filters.modes.includes(opt.id as TransportMode)}
                    onPress={() => toggle('modes', opt.id as TransportMode)}
                  />
                ))}
              </Section>
            ) : null}

            {yearOptions.length > 0 ? (
              <Section title="Jahr">
                {yearOptions.map((year) => (
                  <Pill
                    key={year}
                    label={String(year)}
                    selected={filters.years.includes(year)}
                    onPress={() => toggle('years', year)}
                  />
                ))}
              </Section>
            ) : null}

            {operatorOptions.length > 0 ? (
              <Section title="Operator">
                {operatorOptions.map((opt) => (
                  <Pill
                    key={opt.id}
                    label={opt.label}
                    selected={filters.operatorIds.includes(opt.id)}
                    onPress={() => toggle('operatorIds', opt.id)}
                  />
                ))}
              </Section>
            ) : null}

            {countryOptions.length > 0 ? (
              <Section title="Land">
                {countryOptions.map((opt) => (
                  <Pill
                    key={opt.id}
                    label={opt.label}
                    selected={filters.countries.includes(opt.id)}
                    onPress={() => toggle('countries', opt.id)}
                  />
                ))}
              </Section>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
