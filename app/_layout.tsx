import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';

import { AchievementToast } from '@/components/ui/AchievementToast';
import { ConfettiLayer } from '@/components/ui/ConfettiLayer';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Snackbar } from '@/components/ui/Snackbar';
import { useDbReady } from '@/hooks/useDbReady';
import { useThemeBinding } from '@/hooks/useThemeBinding';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  useThemeBinding();
  const scheme = useColorScheme();
  const navTheme =
    scheme === 'light'
      ? {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            background: colors.background.light,
            card: colors.surface.light,
            text: colors.text.dark,
            primary: colors.primary,
            border: colors.border.light,
          },
        }
      : {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: colors.background.dark,
            card: colors.surface.dark,
            text: colors.text.light,
            primary: colors.primary,
            border: colors.border.dark,
          },
        };

  const { ready, error } = useDbReady();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <ErrorBoundary>
            {error ? (
              <LoadingScreen title="Datenbank-Fehler" subtitle={error.message} />
            ) : !ready ? (
              <LoadingScreen subtitle="Datenbank wird vorbereitet…" />
            ) : (
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
              </Stack>
            )}
            <AchievementToast />
            <ConfettiLayer />
            <Snackbar />
          </ErrorBoundary>
          <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
