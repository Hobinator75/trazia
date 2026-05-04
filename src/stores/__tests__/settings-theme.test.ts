import { describe, expect, it } from 'vitest';

import { useSettingsStore } from '../settings.store';

describe('Phase-1 theme contract', () => {
  it('store default is dark', () => {
    // Phase-1 ships dark-only. The setting and setter still exist for
    // forward-compat (Phase 2+ will surface light-mode tokens), but the
    // default must be dark so first-run users land on the styled
    // surfaces — every screen still hard-codes dark utility classes.
    const fresh = useSettingsStore.getState();
    expect(fresh.theme).toBe('dark');
  });
});
