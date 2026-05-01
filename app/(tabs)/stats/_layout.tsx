import { Stack } from 'expo-router';

export default function StatsStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Statistik' }} />
      <Stack.Screen name="achievement/[id]" options={{ title: 'Achievement' }} />
      <Stack.Screen name="stat/[key]" options={{ title: 'Statistik-Detail' }} />
      <Stack.Screen name="year-in-review" options={{ title: 'Jahresrückblick' }} />
    </Stack>
  );
}
