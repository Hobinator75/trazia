import { useColorScheme as useNativewindColorScheme } from 'nativewind';

import { useSettingsStore } from '@/stores/settings.store';
import type { ResolvedScheme } from '@/theme/colors';

// Returns the *actual* dark/light scheme the UI should render in.
// `theme === 'system'` falls through to the OS appearance setting that
// nativewind exposes; explicit 'light'/'dark' override it. Use this
// instead of react-native's `useColorScheme()` directly so the in-app
// theme picker always wins over the OS.
export function useResolvedScheme(): ResolvedScheme {
  const theme = useSettingsStore((s) => s.theme);
  const { colorScheme } = useNativewindColorScheme();

  if (theme === 'light') return 'light';
  if (theme === 'dark') return 'dark';
  return colorScheme === 'light' ? 'light' : 'dark';
}
