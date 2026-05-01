import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingFirstJourneyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-1 px-6">
        <Text className="mt-4 text-3xl font-bold text-text-light">
          Lass uns deine erste Reise eintragen
        </Text>
        <Text className="mt-2 text-base text-text-muted">
          Wir können dir gleich ein Beispiel zeigen — Hamburg nach Frankfurt mit Lufthansa. Du
          kannst alles nachträglich anpassen.
        </Text>

        <View className="mt-6 rounded-3xl border border-border-dark bg-surface-dark p-5">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Beispielreise
          </Text>
          <Text className="mt-2 text-2xl font-bold text-text-light">HAM → FRA</Text>
          <Text className="text-sm text-text-muted">Lufthansa · gestern · LH034</Text>
        </View>
      </View>

      <View className="gap-3 px-6" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={() => router.push('/onboarding/permissions')}
          className="items-center rounded-full bg-primary py-4 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">Klar, leg los</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/onboarding/permissions')}
          className="items-center py-3"
        >
          <Text className="text-sm text-text-muted">Überspringen</Text>
        </Pressable>
      </View>
    </View>
  );
}
