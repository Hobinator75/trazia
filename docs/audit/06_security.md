# A6 — Security & Privacy

## Hardcoded Keys / IDs?

### AdMob
```
src/lib/ads/units.ts:5-10
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
…
app.json:73-74
"androidAppId": "ca-app-pub-3940256099942544~3347511713",
"iosAppId":     "ca-app-pub-3940256099942544~1458002511",
```

Das sind die **offiziellen Google-Test-IDs** — keine echten AdMob-Konten,
keine Umsatz-Lücke. Aber: Wenn die App **so** in den Store geht, sieht der
Nutzer nur „Test Ad" und Google macht KEINEN Cent.

**Aktion vor Launch**:
1. Echte AdMob-IDs in `.env` (EXPO_PUBLIC_ADMOB_*) und in `app.json`
   (androidAppId/iosAppId) eintragen, **bevor** `eas build --profile production`
   läuft. Die EAS-Profile in `eas.json` haben kein `env`-Mapping für AdMob;
   das musst du vor jedem Production-Build manuell setzen oder als EAS-Secrets
   hinterlegen.

### RevenueCat
```
src/lib/iap/index.ts:9-13
const hasRealApiKey = (): boolean => {
  if (Platform.OS === 'ios') return Boolean(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS);
  …
};
```

Ohne API-Key fallen auf den Mock-Adapter. **Sauber gelöst.** Keine Keys im Repo.

### Sentry
```
app.json:78-83
"@sentry/react-native/expo",
{
  "organization": "REPLACE_WITH_SENTRY_ORG_SLUG",
  "project": "REPLACE_WITH_SENTRY_PROJECT_SLUG"
}
```

Das ist **kein Sicherheitsproblem**, aber **funktional ein Build-Stopper**:
Wenn `eas build` mit dem Sentry-Plugin läuft und es versucht, Source-Maps
hochzuladen, schlägt das mit „organization not found" fehl, falls du es
nicht vorher ersetzt hast oder via SENTRY_AUTH_TOKEN-Env injizierst.

### EAS Submit
```
eas.json:55-67
"appleId": "tim.hobrlant@gmail.com",
"ascAppId": "REPLACE_WITH_APPSTORE_CONNECT_APP_ID",
"appleTeamId": "REPLACE_WITH_APPLE_TEAM_ID"
```

Ebenfalls Platzhalter. `eas submit` schlägt fehl, bis ersetzt.

## Git-Tracking

```
.gitignore lines 33-35
.env
.env*.local
```

✅ `.env` ist ignoriert. `.env.example` ist im Repo — enthält nur leere Keys.

```
.gitignore lines 13-19
.kotlin/
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
```

✅ Apple Provisioning, Google Play Service Accounts und Native-Keys sind
ignoriert.

In `eas.json:62`:
```
"serviceAccountKeyPath": "./.secrets/play-service-account.json"
```

`.secrets/` ist nicht in `.gitignore` — sollte hinzugefügt werden, damit
Tim die Datei nicht versehentlich committed.

## Userdaten lokal

Phase 1 = **lokal-first**. Das wird im Code eingehalten:
- `expo-sqlite` (`trazia.db`) — lokal.
- `AsyncStorage` für Onboarding/Settings/Premium-Cache — lokal.
- **Keine** `fetch`/`axios`/`WebSocket`/`XMLHttpRequest`-Aufrufe im src/-Tree.

Externe Calls gibt es nur über die nativen SDKs:
- AdMob (Werbung — nur im Free-Modus, mit UMP-Consent gating)
- RevenueCat (IAP — nur wenn Premium-Kauf gestartet)
- PostHog (Analytics — opt-in, default OFF)
- Sentry (Crash-Reports — opt-in, default ON)

## Privacy-Compliance

| Aspekt | Status | Notiz |
| --- | --- | --- |
| Sentry honoriert `crashReportsEnabled`-Toggle | ✅ | `beforeSend` callback short-circuited; user-PII gestripped (`event.user`, `device.name`). |
| PostHog honoriert `analyticsEnabled`-Toggle | ✅ | `captureEvent` checkt `isAllowed()` zuerst. |
| Anonymous-ID statt Device-Vendor-ID | ✅ | `anon_<uuid>` in AsyncStorage. |
| iOS NSUserTrackingUsageDescription | ✅ | in `app.json`. |
| ATT-Prompt nur wenn Tracking-Erlaubnis nötig | ✅ | `expo-tracking-transparency`-Plugin. |
| Privacy-Manifest (iOS 17+) | ✅ | NSPrivacyAccessedAPITypes deklariert für UserDefaults + FileTimestamp. |
| Android blockedPermissions | ✅ | ACCESS_FINE_LOCATION + ACCESS_COARSE_LOCATION blockiert. |
| GDPR-Datenschutzerklärung (DE) | ✅ | docs/privacy-policy-de.md. |

## Nicht-spec Network-Calls

Geprüft per `grep -rE "fetch\(|axios|XMLHttpRequest|new WebSocket|RNFetchBlob"
src/ app/`. **Keine Treffer.** Die App ist genau so abgeschottet wie es Phase
1 verlangt.

## Empfehlungen

| # | Aktion | Priorität |
| --- | --- | --- |
| 1 | Echte AdMob-IDs in `app.json` + `.env` (Android/iOS App ID & Unit IDs) eintragen, bevor Production-Build läuft | KRITISCH vor Launch |
| 2 | Sentry-Plugin-Slugs in `app.json` ersetzen oder Plugin entfernen, bis Sentry-Account fertig ist | KRITISCH vor Production-Build |
| 3 | `eas.json`: ASC App ID + Apple Team ID setzen | KRITISCH vor `eas submit` |
| 4 | `.secrets/` in `.gitignore` aufnehmen | 1 min, jetzt machen |
| 5 | Optional: `bundleIdentifier` von `com.trazia.app` validieren — der Name könnte auf App Store Connect blockiert sein, vorher reservieren | wichtig vor Submit |
