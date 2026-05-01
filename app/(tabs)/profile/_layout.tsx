import { Stack } from 'expo-router';

export default function ProfileStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Profil' }} />
      <Stack.Screen name="premium" options={{ title: 'Premium' }} />
      <Stack.Screen name="about" options={{ title: 'Über Trazia' }} />
      <Stack.Screen name="privacy" options={{ title: 'Datenschutz' }} />
      <Stack.Screen name="export" options={{ title: 'Daten-Export' }} />
      <Stack.Screen name="backup" options={{ title: 'Backup' }} />
    </Stack>
  );
}
