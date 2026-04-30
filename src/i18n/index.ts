import de from './de.json';
import en from './en.json';

export const translations = { de, en } as const;
export type Locale = keyof typeof translations;
export type TranslationDictionary = (typeof translations)[Locale];
