import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import '../global.css';

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0A0E1A' },
          headerTintColor: '#F9FAFB',
          contentStyle: { backgroundColor: '#0A0E1A' },
        }}
      />
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
