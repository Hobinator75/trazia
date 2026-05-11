import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useI18nBinding } from '@/i18n/useI18nBinding';
import { configureAds, ensureConsent } from '@/lib/ads';
import { configureIap } from '@/lib/iap';
import { trackAppOpened } from '@/lib/observability/analytics';
import { configureSentry } from '@/lib/observability/sentry';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  useThemeBinding();
  useI18nBinding();

  const hydrateOnboarding = useOnboardingStore((s) => s.hydrate);
  const onboardingHydrated = useOnboardingStore((s) => s.hydrated);
  const onboardingCompleted = useOnboardingStore((s) => s.completed);
  const { t } = useTranslation();

  useEffect(() => {
    void hydrateOnboarding();
    void configureIap();
    void configureSentry();
    void trackAppOpened();
    void (async () => {
      await ensureConsent();
      await configureAds();
    })();
  }, [hydrateOnboarding]);

  const navTheme = {
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
              <LoadingScreen title={t('error.db_error')} subtitle={error.message} />
            ) : !ready || !onboardingHydrated ? (
              <LoadingScreen subtitle={t('error.db_loading')} />
            ) : (
              <Stack screenOptions={{ headerShown: false }}>
                {onboardingCompleted ? (
                  <Stack.Screen name="(tabs)" />
                ) : (
                  <Stack.Screen name="onboarding" />
                )}
              </Stack>
            )}
            <AchievementToast />
            <ConfettiLayer />
            <Snackbar />
          </ErrorBoundary>
          <StatusBar style="light" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
