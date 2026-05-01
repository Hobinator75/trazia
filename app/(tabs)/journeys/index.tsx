import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function JourneysScreen() {
  return (
    <View className="flex-1 bg-background-dark">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="mb-2 text-2xl font-bold text-text-light">Reisen</Text>
        <Text className="text-center text-text-muted">
          Liste deiner geloggten Reisen erscheint hier — kommt in CC-3.3.
        </Text>
      </View>
      <Link href="/journeys/add" asChild>
        <Pressable className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80">
          <Ionicons name="add" size={28} color="white" />
        </Pressable>
      </Link>
    </View>
  );
}
