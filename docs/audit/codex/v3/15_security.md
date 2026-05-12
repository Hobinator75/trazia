# 15 — Security

## Verdict

Keine privaten Secrets im Code gefunden. Release-Gap: Public/Test-IDs und fehlende Production-Konfig sind noch nicht submit-ready.

## Hardcoded Keys / IDs

- AdMob Test Unit IDs in `src/lib/ads/units.ts:17`. Das sind öffentliche Google-Test-IDs, keine Secret-Leaks, aber Production-Blocker für Monetarisierung.
- AdMob Test App IDs in `app.json:79`. Ebenfalls keine Secrets, aber vor Production ersetzen oder Ads deaktivieren.
- Sentry DSN kommt aus `EXPO_PUBLIC_SENTRY_DSN`; ohne DSN bleibt Sentry inert (`src/lib/observability/sentry.ts:22`).
- PostHog Key kommt aus `EXPO_PUBLIC_POSTHOG_API_KEY`; Analytics bleibt ohne Key/toggle off inert (`src/lib/observability/analytics.ts:16`).
- EAS iOS Submit enthält Apple-ID, aber `ascAppId` und `appleTeamId` sind leer (`eas.json:64`).

## .env / gitignore

`.env.example` wirkt sauber und public-var-basiert. `.gitignore` ignoriert `.env`, `.env*.local`, native signing/secrets und `.secrets`.

## Security-Risiko

Kein klassisches Credential-Leak. Die Gefahr ist Fehlkonfiguration: Test Ads im Production-Build, fehlende Sentry/Ad/IAP-Secrets oder leere Submit-Metadaten.

