import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function AchievementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PlaceholderScreen
      title="Achievement"
      subtitle={`Detailansicht für ${id} — kommt in CC-3.7.`}
    />
  );
}
