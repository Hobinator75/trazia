import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboardingStore } from '@/stores/onboardingStore';
import { colors } from '@/theme/colors';

export default function OnboardingPermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const finish = useOnboardingStore((s) => s.finish);
  const [requesting, setRequesting] = useState(false);

  const requestNotificationPermission = async (): Promise<void> => {
    setRequesting(true);
    try {
      // expo-notifications is not installed — once it lands, replace this
      // stub with Notifications.requestPermissionsAsync(). We deliberately
      // avoid a hard dependency in CC-3 so the user can ship without push
      // entitlements until they need them.
      await new Promise((resolve) => setTimeout(resolve, 300));
    } finally {
      setRequesting(false);
    }
  };

  const handleEnableNotifications = async (): Promise<void> => {
    await requestNotificationPermission();
    await finish();
    router.replace('/');
  };

  const handleSkip = async (): Promise<void> => {
    await finish();
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-1 px-6">
        <Text className="mt-4 text-3xl font-bold text-text-light">
          {t('onboarding.permissions.title')}
        </Text>

        <View className="mt-6 rounded-3xl border border-border-dark bg-surface-dark p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            </View>
            <Text className="flex-1 text-base font-semibold text-text-light">
              {t('onboarding.permissions.notifications_title')}
            </Text>
          </View>
          <Text className="mt-3 text-sm text-text-muted">
            {t('onboarding.permissions.notifications_body')}
          </Text>
        </View>

        <View className="mt-3 rounded-3xl border border-border-dark bg-surface-dark p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
              <Ionicons name="lock-closed-outline" size={20} color={colors.secondary} />
            </View>
            <Text className="flex-1 text-base font-semibold text-text-light">
              {t('onboarding.permissions.privacy_title')}
            </Text>
          </View>
          <Text className="mt-3 text-sm text-text-muted">
            {t('onboarding.permissions.privacy_body')}
          </Text>
        </View>
      </View>

      <View className="gap-3 px-6" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleEnableNotifications}
          disabled={requesting}
          className={`items-center rounded-full py-4 ${
            requesting ? 'bg-primary/40' : 'bg-primary active:opacity-80'
          }`}
        >
          <Text className="text-base font-semibold text-white">
            {requesting
              ? t('onboarding.permissions.please_wait')
              : t('onboarding.permissions.enable_notifications')}
          </Text>
        </Pressable>
        <Pressable onPress={handleSkip} className="items-center py-3">
          <Text className="text-sm text-text-muted">
            {t('onboarding.permissions.maybe_later')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
