// Regression guard for the "Unmatched Route - trazia:///" TestFlight bug.
//
// expo-router resolves the deep-link scheme `trazia://` and any
// `router.replace('/')` call to `app/index.tsx`. If that file goes
// missing, the production bundle silently falls through to the default
// Sitemap (which then crashes on an inconsistent route table).
//
// We can't render expo-router itself in a vitest node environment, so
// instead we assert the two contracts that make the redirect work:
//   1. `app/index.tsx` exists and re-exports a default component.
//   2. The two redirect targets it can produce both resolve to real
//      files in the app/ tree.

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_DIR = path.resolve(__dirname, '..', '..', 'app');

describe('initial route resolution', () => {
  it('app/index.tsx exists as the root entry', () => {
    const indexPath = path.join(APP_DIR, 'index.tsx');
    expect(fs.existsSync(indexPath)).toBe(true);

    const src = fs.readFileSync(indexPath, 'utf-8');
    expect(src).toMatch(/export default function/);
    expect(src).toMatch(/Redirect/);
  });

  it('redirect target for completed onboarding resolves to a tab', () => {
    // `/(tabs)/map` → app/(tabs)/map/index.tsx
    const target = path.join(APP_DIR, '(tabs)', 'map', 'index.tsx');
    expect(fs.existsSync(target)).toBe(true);
  });

  it('redirect target for fresh installs resolves to onboarding welcome', () => {
    // `/onboarding/welcome` → app/onboarding/welcome.tsx
    const target = path.join(APP_DIR, 'onboarding', 'welcome.tsx');
    expect(fs.existsSync(target)).toBe(true);
  });

  it('redirect target for first-launch language picker resolves', () => {
    // `/onboarding/language` → app/onboarding/language.tsx (rendered when
    // useSettingsStore.locale === null).
    const target = path.join(APP_DIR, 'onboarding', 'language.tsx');
    expect(fs.existsSync(target)).toBe(true);
  });
});
