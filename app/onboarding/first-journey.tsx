import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { seedExampleJourney } from '@/lib/onboarding/seedExampleJourney';
import { useSnackbarStore } from '@/stores/snackbarStore';

export default function OnboardingFirstJourneyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [working, setWorking] = useState(false);

  const handleAccept = async (): Promise<void> => {
    setWorking(true);
    try {
      const result = await seedExampleJourney(db);
      if (result.status === 'missing-airports') {
        showSnackbar('Beispielreise konnte nicht angelegt werden.', { variant: 'error' });
      } else {
        showSnackbar('Beispielreise erstellt.', { variant: 'success' });
      }
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Fehler beim Anlegen', {
        variant: 'error',
      });
    } finally {
      setWorking(false);
      router.push('/onboarding/permissions');
    }
  };

  const handleAddOwn = (): void => {
    router.push('/journeys/add');
  };

  const handleSkip = (): void => {
    router.push('/onboarding/permissions');
  };

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-1 px-6">
        <Text className="mt-4 text-3xl font-bold text-text-light">
          Lust auf eine Beispielreise?
        </Text>
        <Text className="mt-2 text-base text-text-muted">
          Wir können dir gerne einen Beispielflug eintragen — Frankfurt nach New York mit Lufthansa,
          gestern. So siehst du sofort, wie sich Karte, Statistik und Achievements füllen. Du kannst
          die Reise jederzeit löschen.
        </Text>

        <View className="mt-6 rounded-3xl border border-border-dark bg-surface-dark p-5">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Beispielreise
          </Text>
          <Text className="mt-2 text-2xl font-bold text-text-light">FRA → JFK</Text>
          <Text className="text-sm text-text-muted">Lufthansa · gestern · LH 400 · A350-900</Text>
        </View>
      </View>

      <View className="gap-3 px-6" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleAccept}
          disabled={working}
          className={`flex-row items-center justify-center gap-2 rounded-full py-4 ${
            working ? 'bg-primary/40' : 'bg-primary active:opacity-80'
          }`}
        >
          {working ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="add-circle-outline" size={18} color="white" />
          )}
          <Text className="text-base font-semibold text-white">
            {working ? 'Wird angelegt…' : 'Beispielreise anlegen'}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleAddOwn}
          disabled={working}
          className="flex-row items-center justify-center gap-2 rounded-full border border-border-dark py-4 active:opacity-80"
        >
          <Ionicons name="create-outline" size={18} color="#F9FAFB" />
          <Text className="text-base font-semibold text-text-light">Eigene Reise eintragen</Text>
        </Pressable>
        <Pressable onPress={handleSkip} className="items-center py-3">
          <Text className="text-sm text-text-muted">Später erfassen</Text>
        </Pressable>
      </View>
    </View>
  );
}
