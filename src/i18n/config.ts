import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';

// Phase 1: de + en ship with full translations. Phase 2/3 languages
// (es, fr, it, pt, nl, pl, tr, ru, zh, ja, ko, ar) inherit from `en`
// via i18next's fallbackLng so the UI never shows raw keys. As soon as
// a translator delivers a bundle, drop it in src/i18n/locales/<code>.json
// and add it to the resources map below.
export type SupportedLocale =
  | 'de'
  | 'en'
  | 'es'
  | 'fr'
  | 'it'
  | 'pt'
  | 'nl'
  | 'pl'
  | 'tr'
  | 'ru'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'ar';

export const SUPPORTED_LOCALES: ReadonlyArray<{ code: SupportedLocale; nativeName: string }> = [
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'en', nativeName: 'English' },
  { code: 'es', nativeName: 'Español' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'nl', nativeName: 'Nederlands' },
  { code: 'pl', nativeName: 'Polski' },
  { code: 'tr', nativeName: 'Türkçe' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'zh', nativeName: '中文' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'ko', nativeName: '한국어' },
  { code: 'ar', nativeName: 'العربية' },
];

const resources = {
  de: { translation: de },
  en: { translation: en },
} as const;

let initialized = false;

export function ensureI18nInitialized(initialLocale: SupportedLocale = 'en'): typeof i18n {
  if (initialized) {
    if (i18n.language !== initialLocale) {
      void i18n.changeLanguage(initialLocale);
    }
    return i18n;
  }
  initialized = true;
  void i18n.use(initReactI18next).init({
    resources,
    lng: initialLocale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: 'v4',
  });
  return i18n;
}

export function normalizeLocale(input: string | null | undefined): SupportedLocale {
  if (!input) return 'en';
  const lower = input.toLowerCase();
  // Match by language prefix (e.g. "de-AT" → "de", "zh-Hans-CN" → "zh").
  const prefix = lower.split(/[-_]/)[0];
  const match = SUPPORTED_LOCALES.find((entry) => entry.code === prefix);
  return match ? match.code : 'en';
}

export default i18n;
