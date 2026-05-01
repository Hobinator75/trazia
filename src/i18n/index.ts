import * as Localization from 'expo-localization';

import de from './de.json';
import en from './en.json';

import { useSettingsStore, type LanguagePreference } from '@/stores/settings.store';

export const translations = { de, en } as const;
export type Locale = keyof typeof translations;
export type TranslationDictionary = (typeof translations)[Locale];

const isLocale = (value: string): value is Locale => value === 'de' || value === 'en';

const detectSystemLocale = (): Locale => {
  const tag = Localization.getLocales()[0]?.languageCode ?? 'en';
  return isLocale(tag) ? tag : 'en';
};

export const resolveLocale = (preference: LanguagePreference): Locale =>
  preference === 'system' ? detectSystemLocale() : preference;

// Reactive locale resolver — re-renders when language preference flips. Use
// in components instead of `resolveLocale(state.language)` so a change in
// settings re-renders translated strings.
export function useLocale(): Locale {
  const language = useSettingsStore((s) => s.language);
  return resolveLocale(language);
}

type DotPath<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends object ? DotPath<T[K], `${P}${K}.`> : `${P}${K}`;
}[keyof T & string];

export type TranslationKey = DotPath<TranslationDictionary>;

const lookup = (dict: unknown, parts: string[]): string | undefined => {
  let cursor: unknown = dict;
  for (const part of parts) {
    if (typeof cursor !== 'object' || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === 'string' ? cursor : undefined;
};

export function translate(key: TranslationKey, locale: Locale = 'en'): string {
  const parts = key.split('.');
  const direct = lookup(translations[locale], parts);
  if (direct !== undefined) return direct;
  const fallback = lookup(translations.en, parts);
  return fallback ?? key;
}

export function useTranslations(): {
  locale: Locale;
  t: (key: TranslationKey) => string;
} {
  const locale = useLocale();
  return {
    locale,
    t: (key) => translate(key, locale),
  };
}
