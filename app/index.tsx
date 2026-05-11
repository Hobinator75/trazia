import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useOnboardingStore } from '@/stores/onboardingStore';

// Root entry. expo-router resolves the `trazia://` deep-link and the
// post-onboarding `router.replace('/')` to this file; without it the
// production bundle falls through to the default Sitemap (the "Unmatched
// Route" page seen in TestFlight build 1).
//
// `_layout.tsx` already gates Stack rendering on `onboardingHydrated`, so
// in normal mounts the store is hydrated by the time we get here. The
// hydration guard below is a belt-and-braces fallback against future
// layout changes that would mount this screen earlier.
export default function Index() {
  const hydrated = useOnboardingStore((s) => s.hydrated);
  const completed = useOnboardingStore((s) => s.completed);

  if (!hydrated) {
    return <LoadingScreen subtitle="Wird vorbereitet…" />;
  }

  return <Redirect href={completed ? '/(tabs)/map' : '/onboarding/welcome'} />;
}
