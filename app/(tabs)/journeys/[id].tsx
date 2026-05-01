import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function JourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PlaceholderScreen
      title="Reise-Detail"
      subtitle={`Detailansicht für Reise ${id}. Kommt in CC-3.4.`}
    />
  );
}
