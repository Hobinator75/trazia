import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useSettingsStore } from '@/stores/settings.store';

// Root entry. expo-router resolves the `trazia://` deep-link and the
// post-onboarding `router.replace('/')` to this file; without it the
// production bundle falls through to the default Sitemap (the "Unmatched
// Route" page seen in TestFlight build 1).
//
// Fresh installs hit the language picker before the existing welcome
// step: `useSettingsStore.locale === null` means the user has not yet
// confirmed a language, even though the UI already renders in the
// device locale via useI18nBinding.
export default function Index() {
  const { t } = useTranslation();
  const hydrated = useOnboardingStore((s) => s.hydrated);
  const completed = useOnboardingStore((s) => s.completed);
  const locale = useSettingsStore((s) => s.locale);

  if (!hydrated) {
    return <LoadingScreen subtitle={t('common.loading')} />;
  }

  if (completed) return <Redirect href="/(tabs)/map" />;
  return <Redirect href={locale ? '/onboarding/welcome' : '/onboarding/language'} />;
}
