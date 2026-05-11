import { describe, expect, it } from 'vitest';

import { useSettingsStore } from '../settings.store';

describe('theme contract', () => {
  it('store default is system', () => {
    // Phase-1 shipped dark-only; the i18n+light-mode bucket flips the
    // default to 'system' so the OS appearance setting drives the look.
    // Existing installs keep their 'dark' value via the v2 migration in
    // settings.store.ts.
    const fresh = useSettingsStore.getState();
    expect(fresh.theme).toBe('system');
  });
});
