import { create } from 'zustand';

export interface SnackbarPayload {
  id: number;
  message: string;
  variant: 'info' | 'success' | 'error';
  durationMs: number;
}

interface SnackbarState {
  current: SnackbarPayload | null;
  show: (
    message: string,
    options?: { variant?: SnackbarPayload['variant']; durationMs?: number },
  ) => void;
  dismiss: () => void;
}

let nextId = 1;

export const useSnackbarStore = create<SnackbarState>((set) => ({
  current: null,
  show: (message, options) => {
    set({
      current: {
        id: nextId++,
        message,
        variant: options?.variant ?? 'info',
        durationMs: options?.durationMs ?? 3000,
      },
    });
  },
  dismiss: () => set({ current: null }),
}));
