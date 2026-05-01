import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { TransportMode } from '@/types/domain-types';

const STORAGE_KEY = 'onboarding.completed';

export interface OnboardingState {
  completed: boolean;
  hydrated: boolean;
  selectedModes: TransportMode[];
  hydrate: () => Promise<void>;
  setSelectedModes: (modes: TransportMode[]) => void;
  finish: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  completed: false,
  hydrated: false,
  selectedModes: ['flight'],

  hydrate: async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      set({ completed: value === 'true', hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setSelectedModes: (selectedModes) => set({ selectedModes }),

  finish: async () => {
    set({ completed: true });
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
  },

  reset: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ completed: false });
  },
}));

export const ensureOnboardingHydrated = (): Promise<void> =>
  useOnboardingStore.getState().hydrate();
