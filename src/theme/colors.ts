export const colors = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F97316',
  ocean: '#06B6D4',
  background: {
    dark: '#0A0E1A',
    light: '#F9FAFB',
  },
  surface: {
    dark: '#111827',
    light: '#FFFFFF',
  },
  border: {
    dark: '#1F2937',
    light: '#E5E7EB',
  },
  text: {
    light: '#F9FAFB',
    muted: '#9CA3AF',
    dark: '#0A0E1A',
    mutedLight: '#4B5563',
  },
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
} as const;

export const modeColors = {
  flight: colors.primary,
  train: colors.secondary,
  car: colors.accent,
  ship: colors.ocean,
  other: colors.text.muted,
} as const;

export type AppColors = typeof colors;
export type ModeColor = keyof typeof modeColors;
