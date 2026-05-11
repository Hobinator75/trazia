// Locale-aware integer formatter. Falls back to the active i18next
// language so numbers read naturally for the user (1.234 in de-*, 1,234
// in en-*). Call sites should pass `i18n.language` or the value from
// `useTranslation()`.
export function formatInt(value: number, locale: string): string {
  return Math.round(value).toLocaleString(locale);
}

export function formatFloat(value: number, locale: string, digits = 2): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
