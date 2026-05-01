import { create } from 'zustand';

export type ThemePreference = 'dark' | 'light' | 'system';
export type DistanceUnit = 'km' | 'mi';
export type LanguagePreference = 'de' | 'en' | 'system';

interface SettingsState {
  theme: ThemePreference;
  distanceUnit: DistanceUnit;
  language: LanguagePreference;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  profileName: string | null;
  avatarUri: string | null;
  setTheme: (theme: ThemePreference) => void;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setLanguage: (lang: LanguagePreference) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setProfileName: (name: string | null) => void;
  setAvatarUri: (uri: string | null) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  distanceUnit: 'km',
  language: 'system',
  soundEnabled: true,
  notificationsEnabled: false,
  profileName: null,
  avatarUri: null,
  setTheme: (theme) => set({ theme }),
  setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
  setLanguage: (language) => set({ language }),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  setProfileName: (profileName) => set({ profileName }),
  setAvatarUri: (avatarUri) => set({ avatarUri }),
}));
