import { Stack } from 'expo-router';

export default function MapStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Map' }} />
      <Stack.Screen name="[id]" options={{ title: 'Reise' }} />
    </Stack>
  );
}
