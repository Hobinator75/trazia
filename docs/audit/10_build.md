# C1 — Build-Versuch

## Read-Only-Beschränkung

Der Audit-Auftrag ist Read-only. `npx expo prebuild --clean` würde die
Verzeichnisse `ios/` und `android/` neu erzeugen — wurde daher hier nicht
ausgeführt. Stattdessen sind die folgenden non-mutierenden Checks
gelaufen:

## `npx expo config --type prebuild`

Liefert die finale Plugin-Pipeline ohne Files anzulegen. Output ist gültig,
keine Plugin-Konflikte. Das deutet darauf hin, dass `prebuild` selbst nicht
crashed.

## `npx expo-doctor`

```
15/17 checks passed. 2 checks failed.
```

### ❌ Check 1 — `app.json`-Schema

```
Field: android - should NOT have additional property 'compileSdkVersion'.
Field: android - should NOT have additional property 'targetSdkVersion'.
```

In `app.json:34-35` stehen:
```json
"compileSdkVersion": 35,
"targetSdkVersion": 35,
```

Das ist im Expo-app.json-Schema **nicht erlaubt**. Diese Werte müssen via
`expo-build-properties`-Plugin gesetzt werden:

```json
[
  "expo-build-properties",
  {
    "android": { "compileSdkVersion": 35, "targetSdkVersion": 35 }
  }
]
```

Aktueller Zustand: Expo CLI ignoriert die Felder still beim Default-Build.
Bei strikter Validierung (manche EAS-Versionen) bricht der Build ab. Mittel-
Schwere — vor `eas build` umstellen.

### ❌ Check 2 — Fehlende Peer-Dependency

```
Missing peer dependency: expo-asset
Required by: expo-audio
Advice: Install missing required peer dependency with "npx expo install expo-asset"
Your app may crash outside of Expo Go without this dependency.
```

**Das ist ein konkretes Crash-Risiko für native Builds (TestFlight, APK,
Play Internal).** In Expo Go funktioniert es weil dort `expo-asset` schon
gebundelt ist; sobald Tim die App via EAS baut, kann das beim Achievement-
Sound (oder anderswo) crashen.

**Fix**: `npx expo install expo-asset`. 1 min.

## Was sonst noch beim Build mit hoher Wahrscheinlichkeit schiefgeht

Aus 06_security.md übertragen:

1. **Sentry-Plugin** mit Platzhaltern in `app.json:81-82`:
   ```
   "organization": "REPLACE_WITH_SENTRY_ORG_SLUG",
   "project": "REPLACE_WITH_SENTRY_PROJECT_SLUG"
   ```
   Wenn der Sentry-Plugin Source-Maps hochladen will, schlägt der EAS-Build
   mit „organization not found" fehl. Sofort ersetzen oder `SENTRY_AUTH_TOKEN`
   leer lassen, dann skippt das Plugin den Upload.

2. **AdMob-IDs** sind Google-Test-IDs. Build läuft, aber im Produktiv-Modus
   sieht der User „Test Ad" überall — Tims App macht keinen Cent.

3. **`app.json`-Plugins**: 12 Plugins. Reihenfolge prüfen:
   - `expo-router`
   - `expo-splash-screen`
   - `expo-sqlite`
   - `expo-localization`
   - `@react-native-community/datetimepicker`
   - `expo-audio`
   - `react-native-google-mobile-ads` (mit Test-App-IDs)
   - `@sentry/react-native/expo`
   - `expo-tracking-transparency`

   Nichts auffälliges, aber `expo-audio` + fehlendes `expo-asset` ist die
   einzige bekannte Gefahr.

## Empfehlung

Vor dem ersten EAS-Build:

| # | Aktion | Zeit |
| --- | --- | --- |
| 1 | `npx expo install expo-asset` | 1 min |
| 2 | `compileSdkVersion`/`targetSdkVersion` aus `app.json:android` entfernen oder via `expo-build-properties` setzen | 5 min |
| 3 | Sentry-Plugin: organization/project ersetzen oder Plugin temporär entfernen | 5 min |
| 4 | Erst dann `npx expo prebuild --clean && eas build --profile development --platform ios` | 20-40 min Build-Zeit |
| 5 | Wenn iOS-Sim-Build durchläuft, manueller Smoke-Test wie in 11_test_script.md beschrieben | 1-2 h |

**Bewertung**: Es gibt **keine Build-Blocker, die der Code selbst verursacht**.
Aber drei Konfigurations-Fixes sind erforderlich, bevor der erste echte
Native-Build sauber durchläuft.
