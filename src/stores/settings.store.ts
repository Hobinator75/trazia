import { create } from 'zustand';

export type ThemePreference = 'dark' | 'light' | 'system';
export type DistanceUnit = 'km' | 'mi';

interface SettingsState {
  theme: ThemePreference;
  distanceUnit: DistanceUnit;
  setTheme: (theme: ThemePreference) => void;
  setDistanceUnit: (unit: DistanceUnit) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  distanceUnit: 'km',
  setTheme: (theme) => set({ theme }),
  setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
}));
