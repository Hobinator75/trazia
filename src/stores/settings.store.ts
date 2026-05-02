import { create } from 'zustand';

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

export const useSettingsStore = create<SettingsState>((set) => ({
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
}));
