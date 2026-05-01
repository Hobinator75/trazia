import { create } from 'zustand';

export type ThemePreference = 'dark' | 'light' | 'system';
export type DistanceUnit = 'km' | 'mi';

interface SettingsState {
  theme: ThemePreference;
  distanceUnit: DistanceUnit;
  soundEnabled: boolean;
  setTheme: (theme: ThemePreference) => void;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  distanceUnit: 'km',
  soundEnabled: true,
  setTheme: (theme) => set({ theme }),
  setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
}));
