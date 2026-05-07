# Trazia · Release-Checklist

Vor jedem Store-Submit alle Punkte abhaken. Ergänzungen gerne via PR.

## ⚠️ Hard-Stops vor erstem Production-Build

Diese Punkte sind nach dem Audit-Fix-Pass **noch offen** und blockieren den
Production-Submit, wenn nicht vorher erledigt:

- [ ] **AdMob-Production-IDs (BLOCKING).** `src/lib/ads/units.ts` und
      `app.json:plugins.react-native-google-mobile-ads.{ios,android}AppId`
      zeigen aktuell auf Google's Sample-Test-IDs (`ca-app-pub-3940256099942544~…`).
      Vor dem ersten Production-Build durch echte IDs ersetzen, idealerweise
      über EAS-Secrets — sonst sieht der User „Test Ad" und kein Cent fließt.
- [ ] **App Privacy Details auf App Store Connect eingetragen** (Tim macht
      manuell vor Submit). Datenkategorien und Drittanbieter müssen mit
      `docs/privacy-policy-de.md` / `docs/privacy-policy-en.md`
      übereinstimmen (Sentry, PostHog, AdMob, RevenueCat).
- [ ] **Privacy-Manifests aller SDKs verifiziert.** Nach dem ersten
      EAS-Build über Xcode → Privacy Report Tool prüfen, dass keine
      undokumentierten Reasons / Required-Reason-APIs verwendet werden.
- [ ] **Datenschutzerklärung ist auf trazia.com/privacy verfügbar**
      (Tim macht manuell). Beide Sprachen (DE/EN) auf den Stand von
      `docs/privacy-policy-{de,en}.md` bringen.
- [ ] **Sentry-Account anlegen + DSN setzen.** `app.json:plugins.@sentry/react-native/expo`
      hat `organization: "trazia"` / `project: "trazia"` als Platzhalter; ohne
      `SENTRY_AUTH_TOKEN` als EAS-Secret skipt das Plugin den Source-Map-
      Upload still (Build geht durch, keine Symbolicate-Fähigkeit). Für echte
      Crash-Reports: Org/Project bei sentry.io anlegen, `EXPO_PUBLIC_SENTRY_DSN`
      und `SENTRY_AUTH_TOKEN` als EAS-Secrets hinterlegen.
- [ ] **Apple Developer Account einrichten + ASC App ID + Apple Team ID setzen.**
      `eas.json:submit.{preview,production}.ios.ascAppId` und `appleTeamId`
      sind aktuell leere Strings. Vor `eas submit --profile production`
      ausfüllen.
- [ ] **Echte Bahnhof-Daten erweitern.** `assets/static/train_stations.json`
      enthält 124 Stationen (Europa-Schwerpunkt + JP/US-Top-10). Außerhalb
      Europa kann der User nicht suchen. Post-Launch-TODO: per Overpass-API
      auf 5–10k Stationen ausbauen, oder kuratierte Listen-Erweiterung.

## DB-Migrationen (jeder Release)

Achievement-ID-Renames werden über zwei parallele Wege gefahren:

1. **Drizzle-SQL-Migration** (`src/db/migrations/000X_*.sql`) — läuft beim
   ersten App-Start auf einem aktualisierten Device, einmalig, durch
   Drizzle's Journal getrackt.
2. **Code-Migration** (`src/lib/achievements/migration.ts` →
   `ACHIEVEMENT_ID_MIGRATIONS`) — läuft bei JEDEM Cold-Start, ist
   idempotent (eigene Log-Tabelle `achievement_id_migrations_log`),
   transaktional (ROLLBACK on error) und greift auch dann, wenn die
   SQL-Migration mittendrin gecrasht ist.

Bei jedem neuen ID-Rename:

- [ ] Eintrag in `ACHIEVEMENT_ID_MIGRATIONS` ergänzen (`fromId`, `toId`,
      `reason`)
- [ ] Test in `src/lib/achievements/__tests__/migration.test.ts` erweitert
- [ ] Catalog-Test (`catalog.test.ts`) aktualisiert: alte ID darf nicht
      mehr im Katalog sein
- [ ] **Optional** — neue `0XYZ_achievement_id_<name>.sql` für
      schnelleren First-Run; redundant, aber gibt zusätzlichen
      Sicherheits-Layer für seltene Edge-Cases (kalter Start ohne
      App-Update).
- [ ] In RELEASE_CHECKLIST gezielt erwähnen, falls Sentry-Conflict-Reports
      erwartet werden (zwei-Unlock-Edge-Case)

### Aktive Renames in dieser Release-Linie (CC-3.1)

Sieben Achievement-ID-Renames laufen seit Branch `feat/cc-3.1-achievements-32`
über die Code-Migration (kein neuer SQL-Migrations-File — der bestehende
no-op aus 0002 + die Code-Migration decken alle Devices ab):

| from                  | to                       |
| --------------------- | ------------------------ |
| `pacific_crosser`     | `transpacific`           |
| `arctic_explorer`     | `arctic_crosser`         |
| `star_alliance`       | `star_alliance_collector`|
| `oneworld_alliance`   | `oneworld_collector`     |
| `skyteam_alliance`    | `skyteam_collector`      |
| `jumbo_jet`           | `jumbo_rider`            |
| `flight_around_world` | `earth_circumference`    |

Auf Devices, die genau eine der alten **und** die neue ID gleichzeitig
unlocked haben (Edge-Case durch lokales Manual-Tinkering oder eine
fehlgeschlagene Vorab-Migration), greift der Conflict-Skip-Pfad — die
App startet, der Conflict wird in Sentry geloggt, manuelles Cleanup
post-launch wenn relevant.

## 0 · Pre-Flight

- [ ] Alle Tests grün lokal: `npm run typecheck && npm run lint && npm run format:check && npm run test`
- [ ] `git status` sauber, alle gewünschten Änderungen committed
- [ ] Aktuelle EAS-CLI: `eas --version`
- [ ] Logged in: `eas whoami`

## 1 · Versionierung

- [ ] Version-Bump entschieden (patch/minor/major)
- [ ] `npm run bump:<patch|minor|major>` ausgeführt — schreibt `app.json` (`version`, `ios.buildNumber`, `android.versionCode`)
- [ ] Commit der Bump-Änderungen: `git commit -am "chore: bump to vX.Y.Z"`
- [ ] Tag gesetzt: `git tag -a vX.Y.Z -m "Trazia vX.Y.Z"`
- [ ] Tag pushen: `git push && git push --tags`

## 2 · Assets

- [ ] iOS-Icon `1024×1024` ohne Transparenz unter `assets/images/icon.png`
- [ ] Android Adaptive Icons (foreground / background / monochrome) komplett unter `assets/images/`
- [ ] Splash-Screen alle Auflösungen — Default-Asset `assets/images/splash-icon.png` reicht für Expo (auto-resized)
- [ ] Marketing-Screenshots final (5 pro Plattform, alle iOS-Größen die Apple verlangt)
- [ ] App-Icon im Build-Plugin korrekt referenziert (`expo prebuild --clean` zur Verifikation)

## 3 · Konfiguration & Secrets

- [ ] `app.json`:
  - [ ] `bundleIdentifier`: `com.trazia.app`
  - [ ] `package`: `com.trazia.app`
  - [ ] `targetSdkVersion` ≥ 35 (Android 14+)
  - [ ] AdMob App-IDs sind PRODUKTIV (nicht die Sample-IDs `~3347511713` / `~1458002511`)
  - [ ] Sentry org / project Slugs gesetzt
- [ ] `.env`-Werte in EAS-Secrets gespiegelt: `eas secret:list`
  - [ ] `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
  - [ ] `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`
  - [ ] `EXPO_PUBLIC_ADMOB_*` (alle 6 IDs)
  - [ ] `EXPO_PUBLIC_SENTRY_DSN`
  - [ ] `EXPO_PUBLIC_POSTHOG_API_KEY` (+ `_HOST` falls EU/US)
- [ ] `SENTRY_AUTH_TOKEN` als EAS-Secret hinterlegt — Source-Maps werden automatisch via `@sentry/react-native/expo` Plugin hochgeladen.

## 4 · Privacy / Legal

- [ ] iOS Privacy-Manifest aktuell (`ios.privacyManifests` in `app.json`)
- [ ] App Tracking Transparency Eintrag (`NSUserTrackingUsageDescription`) auf Deutsch + verständlich
- [ ] Datenschutzerklärung (`/profile/privacy`) ist auf dem aktuellen Stand
- [ ] Impressum (`/profile/imprint`) — Anschrift, vollständig
- [ ] AGB (`/profile/terms`) — abgeglichen mit Apple/Google-Vorgaben für Subscriptions
- [ ] Datenschutzerklärung-URL im App-Store / Play-Store Listing eingetragen

## 5 · Monetization

- [ ] RevenueCat:
  - [ ] Produkte `trazia_premium_monthly` (4,99 €) + `trazia_premium_yearly` (29,99 €, 7 Tage Trial) in App Store Connect + Play Console approved
  - [ ] RevenueCat-Offering `current` zeigt beide Pakete
  - [ ] Webhook-Test (Sandbox-Subscription) durchgelaufen
- [ ] AdMob:
  - [ ] Ad-Units pro Plattform (Banner / Interstitial / Rewarded) angelegt
  - [ ] Channels für Tracking gesetzt
  - [ ] UMP-Consent-Form publiziert (Privacy & Messaging)
- [ ] Sentry-Project mit korrektem Release-Format (`com.trazia.app@vX.Y.Z+buildNum`)
- [ ] PostHog-Project: opt-in flag verifiziert (Settings-Toggle muss EVENTS verhindern wenn aus)

## 6 · Funktions-Smoke-Test (auf 3 Geräten: kleines iPhone, großes iPhone, Pixel)

- [ ] Onboarding läuft komplett durch, Toggle Sounds + Notifications funktionieren
- [ ] AddJourney: Flug HAM-FRA mit Lufthansa-Operator + B738-Aircraft eintragen → erscheint in Liste, MapView, Stats
- [ ] Achievement-Pfad zu 100%: erstes Journey → Toast + Konfetti + Sound
- [ ] Long-Press-Menü auf Reise: Edit / Duplicate / Add to Trip / Delete
- [ ] Swipe-left auf Karte → Delete mit Confirm
- [ ] Premium-Paywall: Mock AN setzen, AchievementsSection + Year-In-Review zeigen Premium-Branch
- [ ] Restore-Purchases zeigt korrekte Snackbar
- [ ] Rewarded-Ad → 24h ad-free aktiv (Banner verschwindet)
- [ ] Daten-Export JSON / CSV / PDF erzeugen Dateien, die sich teilen lassen
- [ ] Backup → Restore: 5 Reisen, Backup, Wipe, Restore — Counts identisch
- [ ] Privacy / Impressum / AGB scrollbar, Links funktionieren

## 7 · Performance

- [ ] Cold-Start < 3s auf Pixel (mid-range)
- [ ] Globe3D Frame-Rate ≥ 30 fps mit 100 Demo-Flügen, ≥ 20 fps mit 500
- [ ] MapView2D: kein Memory-Spike beim Zoom-In über Europa
- [ ] Vitest läuft < 5s

## 8 · Builds

- [ ] Preview iOS:
  - [ ] `eas build --profile preview --platform ios`
  - [ ] `eas submit --profile preview --platform ios` → TestFlight
  - [ ] Internal-Tester:innen eingeladen
- [ ] Preview Android:
  - [ ] `eas build --profile preview --platform android`
  - [ ] `eas submit --profile preview --platform android` → Internal Testing Track
- [ ] Production iOS:
  - [ ] `eas build --profile production --platform ios`
  - [ ] `eas submit --profile production --platform ios` (App Review)
- [ ] Production Android:
  - [ ] `eas build --profile production --platform android`
  - [ ] `eas submit --profile production --platform android` → Production Track (staged rollout)

## 9 · Store-Listings

- [ ] App Store Connect:
  - [ ] App-Beschreibung DE / EN
  - [ ] Keywords (max 100 Zeichen)
  - [ ] Screenshots in allen Pflicht-Größen
  - [ ] Privacy Nutrition Labels
  - [ ] Age Rating
- [ ] Play Console:
  - [ ] App-Beschreibung DE / EN (kurz + lang)
  - [ ] Feature-Grafik (1024×500)
  - [ ] Screenshots (Phone + Tablet)
  - [ ] Data Safety Form (lokal, kein Tracking ohne Consent)

## 10 · Post-Release

- [ ] Crash-Free Sessions in Sentry beobachten (Tag 1, Woche 1)
- [ ] PostHog-Funnel `app_opened` → `journey_added` checken
- [ ] App-Store-Bewertungen reagieren
- [ ] Roll-back-Plan: alte AAB / IPA in EAS-History gespeichert, EAS-Update-Channel kann Hotfix liefern
