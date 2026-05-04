// Crash reporting is deferred to post-launch (see docs/post-launch-roadmap.md
// → Sprint 1 — GlitchTip preferred, Sentry free tier as fallback). The
// module exports the same surface so call-sites in achievement migration
// reporting and the achievement-id-migration hook keep compiling, but every
// function is a no-op. When crash reporting is reactivated, swap this file
// for a real adapter — no other code needs to change.

export async function configureSentry(): Promise<void> {
  // Intentionally inert. See file header.
}

export async function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  if (__DEV__) console.error('[crash-report (no-op)]', error, context);
}

export async function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
): Promise<void> {
  if (__DEV__) console.warn('[crash-report (no-op)]', level, message, context);
}
