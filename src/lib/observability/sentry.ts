import { useSettingsStore } from '@/stores/settings.store';

// react-native-sentry is loaded lazily so the module is safe to import in
// environments without the native binding (Expo Go, Node tests, web).
type SentryModule = typeof import('@sentry/react-native');

let cached: SentryModule | null = null;
let configured = false;

async function loadSentry(): Promise<SentryModule | null> {
  if (cached) return cached;
  try {
    cached = await import('@sentry/react-native');
    return cached;
  } catch {
    return null;
  }
}

export async function configureSentry(): Promise<void> {
  if (configured) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    // No DSN configured (likely a dev build) — keep Sentry inert. The
    // Settings toggle still works, but no events are sent until the env
    // var is supplied via EAS secrets.
    return;
  }
  const Sentry = await loadSentry();
  if (!Sentry) return;
  Sentry.init({
    dsn,
    debug: __DEV__,
    enableNative: true,
    tracesSampleRate: 0.1,
    // PII opt-out at the SDK level. The Settings toggle additionally
    // short-circuits the beforeSend callback below.
    sendDefaultPii: false,
    beforeSend: (event) => {
      if (!useSettingsStore.getState().crashReportsEnabled) return null;
      // Strip user identifiers — we never want to ship PII even if Sentry
      // captures it from a 3rd-party library.
      delete event.user;
      delete event.contexts?.device?.name;
      return event;
    },
    beforeBreadcrumb: (breadcrumb) => {
      if (!useSettingsStore.getState().crashReportsEnabled) return null;
      return breadcrumb;
    },
  });
  configured = true;
}

export async function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  if (!useSettingsStore.getState().crashReportsEnabled) return;
  const Sentry = await loadSentry();
  if (!Sentry) {
    if (__DEV__) console.error('[Sentry stub] would capture:', error, context);
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export async function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
): Promise<void> {
  if (!useSettingsStore.getState().crashReportsEnabled) return;
  const Sentry = await loadSentry();
  if (!Sentry) {
    if (__DEV__) console.warn('[Sentry stub] would capture message:', message, level, context);
    return;
  }
  Sentry.captureMessage(message, {
    level,
    ...(context?.tags ? { tags: context.tags } : {}),
    ...(context?.extra ? { extra: context.extra } : {}),
  });
}
