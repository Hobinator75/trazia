import { create } from 'zustand';

import type { UnlockResult } from '@/lib/achievements/types';

export type AchievementListener = (unlock: UnlockResult) => void;

interface AchievementStoreState {
  unlocks: UnlockResult[];
  listeners: Set<AchievementListener>;
  setUnlocks: (unlocks: UnlockResult[]) => void;
  appendUnlocks: (newUnlocks: UnlockResult[]) => void;
  addListener: (listener: AchievementListener) => () => void;
  removeListener: (listener: AchievementListener) => void;
  reset: () => void;
}

export const useAchievementStore = create<AchievementStoreState>((set, get) => ({
  unlocks: [],
  listeners: new Set<AchievementListener>(),

  setUnlocks: (unlocks) => set({ unlocks }),

  appendUnlocks: (newUnlocks) => {
    if (newUnlocks.length === 0) return;
    set({ unlocks: [...get().unlocks, ...newUnlocks] });
    const listeners = get().listeners;
    for (const unlock of newUnlocks) {
      for (const listener of listeners) {
        listener(unlock);
      }
    }
  },

  addListener: (listener) => {
    get().listeners.add(listener);
    return () => {
      get().listeners.delete(listener);
    };
  },

  removeListener: (listener) => {
    get().listeners.delete(listener);
  },

  reset: () => set({ unlocks: [], listeners: new Set<AchievementListener>() }),
}));
