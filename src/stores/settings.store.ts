import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { SupportedLocale } from '@/i18n/config';

export type ThemePreference = 'dark' | 'light' | 'system';
export type DistanceUnit = 'km' | 'mi';

// `locale === null` means "the user has not yet picked a language" — the
// language onboarding step keys off that to decide whether to show the
// picker. Once set, the value persists and the picker is skipped on
// subsequent launches.

interface SettingsState {
  theme: ThemePreference;
  locale: SupportedLocale | null;
  distanceUnit: DistanceUnit;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  // Default ON: anonymous stack-traces only, no PII (toggle is mentioned
  // explicitly in the privacy policy).
  crashReportsEnabled: boolean;
  // Default OFF: opt-in DSGVO-compliant analytics.
  analyticsEnabled: boolean;
  profileName: string | null;
  avatarUri: string | null;
  setTheme: (theme: ThemePreference) => void;
  setLocale: (locale: SupportedLocale) => void;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setCrashReportsEnabled: (enabled: boolean) => void;
  setAnalyticsEnabled: (enabled: boolean) => void;
  setProfileName: (name: string | null) => void;
  setAvatarUri: (uri: string | null) => void;
}

// Persisted via AsyncStorage so privacy opt-outs (crash reports,
// analytics) survive an app restart. Keep `version` in lock-step with
// the migration function below — bump and add a branch when changing
// the persisted shape.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      locale: null,
      distanceUnit: 'km',
      soundEnabled: true,
      notificationsEnabled: false,
      crashReportsEnabled: true,
      analyticsEnabled: false,
      profileName: null,
      avatarUri: null,
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setCrashReportsEnabled: (crashReportsEnabled) => set({ crashReportsEnabled }),
      setAnalyticsEnabled: (analyticsEnabled) => set({ analyticsEnabled }),
      setProfileName: (profileName) => set({ profileName }),
      setAvatarUri: (avatarUri) => set({ avatarUri }),
    }),
    {
      name: 'trazia-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<SettingsState>;
        // v2 introduces `locale` (null = "ask the user") and flips the
        // default theme from 'dark' to 'system'. Pre-v2 installs already
        // running on dark stay on dark — only the default for fresh
        // installs changes.
        if (version < 2) {
          return {
            ...state,
            locale: state.locale ?? null,
            theme: state.theme ?? 'dark',
          } as SettingsState;
        }
        return state as SettingsState;
      },
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
        distanceUnit: state.distanceUnit,
        soundEnabled: state.soundEnabled,
        notificationsEnabled: state.notificationsEnabled,
        crashReportsEnabled: state.crashReportsEnabled,
        analyticsEnabled: state.analyticsEnabled,
        profileName: state.profileName,
        avatarUri: state.avatarUri,
      }),
    },
  ),
);
