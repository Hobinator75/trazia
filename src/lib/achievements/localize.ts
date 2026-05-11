import type { Achievement } from './types';

import achievementsDeCatalog from '../../../docs/achievements.de.json';

export type AchievementLocale = 'de' | 'en';

interface LocalizedFields {
  title: string;
  description: string;
}

const deCatalog = achievementsDeCatalog as Record<string, LocalizedFields | undefined>;

// Default to German because the launch market is DACH and the iPhone Tim
// tested on runs in de-DE. Full i18n with a user-controllable language
// picker is tracked in Bucket B (feat/i18n-light-mode).
export function resolveAchievementLocale(systemLocale?: string | null): AchievementLocale {
  if (typeof systemLocale === 'string' && /^en\b/i.test(systemLocale)) return 'en';
  return 'de';
}

export function getLocalizedAchievement(
  achievement: Achievement,
  locale: AchievementLocale = 'de',
): LocalizedFields {
  if (locale === 'de') {
    const de = deCatalog[achievement.id];
    if (de) return de;
  }
  return { title: achievement.title, description: achievement.description };
}
