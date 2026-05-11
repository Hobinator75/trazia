import { describe, expect, it } from 'vitest';

import { loadAchievements } from '../engine';
import { getLocalizedAchievement, resolveAchievementLocale } from '../localize';

describe('achievement localization', () => {
  const catalog = loadAchievements();

  it('every catalog entry has a German translation', () => {
    // getLocalizedAchievement falls back to the English copy when an ID is
    // missing from achievements.de.json. We flag entries where *both* the
    // title and description still match the English source — proper nouns
    // like "Marathon" or "Business Class" stay identical in German, so
    // matching only one field would produce false positives.
    const missing: string[] = [];
    for (const achievement of catalog) {
      const localized = getLocalizedAchievement(achievement, 'de');
      if (
        localized.title === achievement.title &&
        localized.description === achievement.description
      ) {
        missing.push(achievement.id);
      }
    }
    expect(missing, `Missing German translations: ${missing.join(', ')}`).toEqual([]);
  });

  it('falls back to English when locale is en', () => {
    const sample = catalog.find((a) => a.id === 'first_journey');
    expect(sample).toBeDefined();
    if (!sample) return;
    const en = getLocalizedAchievement(sample, 'en');
    expect(en.title).toBe('First Steps');
    expect(en.description).toBe('Log your first journey.');
  });

  it('returns German strings when locale is de', () => {
    const sample = catalog.find((a) => a.id === 'first_flight');
    expect(sample).toBeDefined();
    if (!sample) return;
    const de = getLocalizedAchievement(sample, 'de');
    expect(de.title).not.toBe(sample.title);
    expect(de.description).not.toBe(sample.description);
    expect(de.title.length).toBeGreaterThan(0);
  });

  it('resolveAchievementLocale defaults to de and picks en only for English locales', () => {
    expect(resolveAchievementLocale(undefined)).toBe('de');
    expect(resolveAchievementLocale(null)).toBe('de');
    expect(resolveAchievementLocale('de-DE')).toBe('de');
    expect(resolveAchievementLocale('fr-FR')).toBe('de');
    expect(resolveAchievementLocale('en-US')).toBe('en');
    expect(resolveAchievementLocale('en')).toBe('en');
  });
});
