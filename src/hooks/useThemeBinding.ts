import { colorScheme } from 'nativewind';
import { useEffect } from 'react';

import { useSettingsStore } from '@/stores/settings.store';

// Reflect the user's theme preference into NativeWind so dark: / light:
// utilities resolve correctly. Must be mounted at the root.
export function useThemeBinding(): void {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    colorScheme.set(theme);
  }, [theme]);
}
