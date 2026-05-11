import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n/config';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useSettingsStore } from '@/stores/settings.store';
import { colors } from '@/theme/colors';

export default function OnboardingLanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language ?? 'en') as SupportedLocale;
  const [selected, setSelected] = useState<SupportedLocale>(currentLocale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const onboardingCompleted = useOnboardingStore((s) => s.completed);

  const handleContinue = () => {
    setLocale(selected);
    void i18n.changeLanguage(selected);
    if (onboardingCompleted) {
      router.back();
    } else {
      router.replace('/onboarding/welcome');
    }
  };

  return (
    <View
      className="flex-1 bg-background-dark"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }}
    >
      <View className="px-6">
        <Text className="text-3xl font-bold text-text-light">{t('language.title')}</Text>
        <Text className="mt-2 text-base text-text-muted">{t('language.subtitle')}</Text>
      </View>

      <FlatList
        className="mt-6"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        data={SUPPORTED_LOCALES}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => {
          const isSelected = item.code === selected;
          return (
            <Pressable
              onPress={() => {
                setSelected(item.code);
                void i18n.changeLanguage(item.code);
              }}
              className="mb-2 flex-row items-center justify-between rounded-2xl border bg-surface-dark px-4 py-4 active:opacity-80"
              style={{
                borderColor: isSelected ? colors.primary : colors.border.dark,
                backgroundColor: isSelected ? `${colors.primary}1A` : colors.surface.dark,
              }}
            >
              <Text
                className="text-base font-semibold"
                style={{ color: isSelected ? colors.primary : colors.text.light }}
              >
                {item.nativeName}
              </Text>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        }}
      />

      <View className="px-6">
        <Pressable
          onPress={handleContinue}
          className="items-center rounded-full bg-primary py-4 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">{t('language.continue')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
