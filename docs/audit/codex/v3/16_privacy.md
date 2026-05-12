# 16 — Privacy Compliance

## Verdict

Nicht submit-ready. Die technische Richtung ist gut, aber Settings-Persistenz und In-App-Legal-Copy passen nicht zu den SDKs.

## Sentry

- Sentry nutzt `sendDefaultPii: false` (`src/lib/observability/sentry.ts:31`).
- `beforeSend` droppt Events, wenn Crash Reports disabled sind, und löscht `event.user` sowie Device Name (`src/lib/observability/sentry.ts:39`).
- Problem: `crashReportsEnabled` defaultet auf `true` und ist nicht persistiert (`src/stores/settings.store.ts:32`). Ein User-Opt-out überlebt keinen Neustart. Weil `configureSentry()` beim Boot läuft (`app/_layout.tsx:33`), ist das vor Submit zu fixen.

## PostHog

- Analytics defaultet auf `false` (`src/stores/settings.store.ts:37`).
- Events werden nur bei Opt-in gesendet (`src/lib/observability/analytics.ts:62`).
- Anonyme ID wird erst beim aktivierten Client erzeugt (`src/lib/observability/analytics.ts:27`).
- Auch hier: Setting ist nicht persistiert, daher ist Opt-in nach Neustart wieder aus. Privacy-safe, aber UX/Produkt unsauber.

## ATT / Ads

- `expo-tracking-transparency` ist in `app.json` und `package.json`.
- Kein Code ruft `requestTrackingPermissionsAsync()` oder `getTrackingPermissionsAsync()` auf.
- UMP-Consent wird beim App-Start angestoßen (`src/lib/ads/index.ts:43`, `app/_layout.tsx:38`). UMP ist nicht identisch mit iOS ATT. Wenn personalisierte Ads/IDFA geplant sind, fehlt der echte ATT-Prompt.

## Privacy Manifest

`app.json` enthält iOS Privacy Manifest Reasons für UserDefaults und FileTimestamp (`app.json:19`). Für SDK-Manifeste muss ein echter native build geprüft werden; `expo-doctor` prüft nicht die vollständige App-Store-Privacy-Erklärung.

## Legal Copy

In-App-Datenschutzerklärung (`src/lib/legal/content.ts:7`) erwähnt AdMob/RevenueCat, aber nicht Sentry oder PostHog. Die docs-Privacy-Policy ist umfangreicher als der in-app Text. Das ist ein P1-Compliance-Gap.

## Network Calls

Keine generischen `fetch`/axios-Calls gefunden. Netzfähige SDKs: Sentry, PostHog, Google Mobile Ads/UMP, RevenueCat, Sharing/Mail/Store Links.

