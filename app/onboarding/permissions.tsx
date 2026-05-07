import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboardingStore } from '@/stores/onboardingStore';
import { colors } from '@/theme/colors';

export default function OnboardingPermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    router.replace('/(tabs)/journeys');
  };

  const handleSkip = async (): Promise<void> => {
    await finish();
    router.replace('/(tabs)/journeys');
  };

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-1 px-6">
        <Text className="mt-4 text-3xl font-bold text-text-light">Fast geschafft</Text>

        <View className="mt-6 rounded-3xl border border-border-dark bg-surface-dark p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            </View>
            <Text className="flex-1 text-base font-semibold text-text-light">
              Achievement-Benachrichtigungen
            </Text>
          </View>
          <Text className="mt-3 text-sm text-text-muted">
            Wir benachrichtigen dich nur, wenn du einen Erfolg freigeschaltet hast — keine anderen
            Pushes. Du kannst das jederzeit in den System-Einstellungen ändern.
          </Text>
        </View>

        <View className="mt-3 rounded-3xl border border-border-dark bg-surface-dark p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
              <Ionicons name="lock-closed-outline" size={20} color={colors.secondary} />
            </View>
            <Text className="flex-1 text-base font-semibold text-text-light">Datenschutz</Text>
          </View>
          <Text className="mt-3 text-sm text-text-muted">
            Alle Reise-Daten bleiben lokal auf deinem Gerät. Kein Account nötig, kein Server-Sync,
            kein Tracking ohne Zustimmung.
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
            {requesting ? 'Bitte warten…' : 'Benachrichtigungen erlauben'}
          </Text>
        </Pressable>
        <Pressable onPress={handleSkip} className="items-center py-3">
          <Text className="text-sm text-text-muted">Vielleicht später</Text>
        </Pressable>
      </View>
    </View>
  );
}
