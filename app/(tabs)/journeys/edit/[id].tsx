import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function EditJourneyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PlaceholderScreen
      title="Reise bearbeiten"
      subtitle={`Bearbeitungs-Form für Reise ${id}. Kommt in CC-3.5.`}
    />
  );
}
