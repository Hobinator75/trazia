import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'dark' | 'light' | 'system';
export type DistanceUnit = 'km' | 'mi';

// Note: a `language` setting and the `src/i18n/` subsystem existed but were
// never wired up — Trazia ships German-only for the v1 launch. English will
// land post-Phase-9 with i18next + react-native-localize.

interface SettingsState {
  theme: ThemePreference;
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
      theme: 'dark',
      distanceUnit: 'km',
      soundEnabled: true,
      notificationsEnabled: false,
      crashReportsEnabled: true,
      analyticsEnabled: false,
      profileName: null,
      avatarUri: null,
      setTheme: (theme) => set({ theme }),
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
      version: 1,
      migrate: (persistedState) => persistedState as SettingsState,
      partialize: (state) => ({
        theme: state.theme,
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
