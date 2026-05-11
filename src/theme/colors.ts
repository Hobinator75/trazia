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

// Pre-resolved palettes for theme-aware JS consumers (chrome colour for
// nav theme, status bar tint, MapView colour scheme). Keeps the legacy
// `colors.background.dark` shape working so the partial Tailwind
// migration does not force every file to switch at once.
export const themePalette = {
  light: {
    background: colors.background.light,
    surface: colors.surface.light,
    border: colors.border.light,
    text: colors.text.dark,
    textMuted: colors.text.mutedLight,
  },
  dark: {
    background: colors.background.dark,
    surface: colors.surface.dark,
    border: colors.border.dark,
    text: colors.text.light,
    textMuted: colors.text.muted,
  },
} as const;

export type ResolvedScheme = keyof typeof themePalette;

export function paletteFor(scheme: ResolvedScheme): (typeof themePalette)[ResolvedScheme] {
  return themePalette[scheme];
}

export const modeColors = {
  flight: colors.primary,
  train: colors.secondary,
  car: colors.accent,
  ship: colors.ocean,
  other: colors.text.muted,
} as const;

export type AppColors = typeof colors;
export type ModeColor = keyof typeof modeColors;
