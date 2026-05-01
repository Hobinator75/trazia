import { Stack } from 'expo-router';

export default function JourneysStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Reisen' }} />
      <Stack.Screen name="add" options={{ title: 'Neue Reise', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Reise' }} />
      <Stack.Screen name="edit/[id]" options={{ title: 'Reise bearbeiten' }} />
    </Stack>
  );
}
