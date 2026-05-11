import * as Localization from 'expo-localization';
import { useEffect } from 'react';

import { useSettingsStore } from '@/stores/settings.store';

import { ensureI18nInitialized, normalizeLocale, type SupportedLocale } from './config';

// Initialise i18next on first mount and react to user-driven locale
// changes. When the user has not yet picked a language (locale === null)
// we render the UI in the device locale, but we do *not* persist that
// choice — the onboarding language step still appears and the user's
// confirmed selection is what gets saved.
export function useI18nBinding(): void {
  const locale = useSettingsStore((s) => s.locale);

  useEffect(() => {
    const effective: SupportedLocale =
      locale ?? normalizeLocale(Localization.getLocales()[0]?.languageTag);
    ensureI18nInitialized(effective);
  }, [locale]);
}
