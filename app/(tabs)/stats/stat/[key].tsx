import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';

export default function StatDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  return (
    <PlaceholderScreen
      title="Statistik-Detail"
      subtitle={`Drilldown für "${key}" — kommt in CC-3.6.`}
    />
  );
}
