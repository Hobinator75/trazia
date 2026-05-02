# A1 — Repo-Struktur

Audit-Datum: 2026-05-02. Vergleich gegen die im README beschriebene Struktur und
die in den Phasen-Prompts genannten Verzeichnisse.

## FOUND (vorhanden, sinnvoll besetzt)

| Pfad | Inhalt |
| --- | --- |
| `app/` | expo-router (tabs, onboarding, dynamische `[id]`-Routen) |
| `app/(tabs)/{map,journeys,stats,profile}/` | Vier Tabs vorhanden, jeweils mit eigenem `_layout.tsx` |
| `app/onboarding/` | welcome / modes / first-journey / permissions |
| `src/components/ui/` | 14 generische Komponenten (FormField, Snackbar, Toast, Confetti, …) |
| `src/components/domain/` | JourneyCard, ModePicker, Globe3D, MapView2D, Stats-Karten, Achievements-Karte, Filter-Sheet, EntitySearchModal, AdaptiveBannerAd, PremiumUpsellSheet, ProfileHeader |
| `src/db/` | `client.ts`, `schema.ts`, `types.ts`, Repositories für location/operator/vehicle/journey/achievement, Seed |
| `src/db/migrations/` | `0000_initial.sql`, `0001_seed_columns.sql`, `migrations.js` |
| `src/db/__tests__/` | seed.test, schema.smoke.test, location/operator/vehicle.repository.test |
| `src/lib/geo/` | Haversine, Bearing, GreatCircle, Bezier, Atlantik/Pazifik/Polar/Antipoden + Tests |
| `src/lib/achievements/` | engine, sync, tier, types, index + Tests |
| `src/lib/stats/` | aggregateStats, statsByMode/Year/Month, topRoutes, topOperators, memoize + Tests |
| `src/lib/forms/` | flight/other Zod-Schemata |
| `src/lib/ads/` | units, index (configure/consent), interstitialController, rewarded |
| `src/lib/iap/` | index, mock, revenuecat, types |
| `src/lib/observability/` | sentry.ts, analytics.ts |
| `src/lib/backup/` | writeBackupFile, restoreFromBackup |
| `src/lib/data/` | wipeAll |
| `src/lib/export/` | csv, json, pdf, snapshot, index |
| `src/lib/journeys/` | format, sections (Filter/Section/Buckets) |
| `src/lib/legal/` | content (markdown loader) |
| `src/lib/routes/` | index (placeholder) |
| `src/lib/sound.ts` | Stub für Achievement-Chime |
| `src/stores/` | onboarding, premium, achievement, snackbar, settings.store + index |
| `src/hooks/` | useDbReady, useDbSeed, useJourneys, useStatsData, useIsPremium, useOfferings, useUpsellTriggers, useThemeBinding |
| `src/i18n/` | de.json, en.json + index |
| `src/theme/` | colors, typography, index |
| `src/types/` | domain-types |
| `assets/static/` | airports/airlines/aircraft .json **(Mini-Sample, siehe MISSING)** |
| `docs/` | achievements.json, imprint-de.md, privacy-policy-de.md, terms-de.md |

## MISSING (laut Spec/Phasen erwartet, aber nicht da)

### Kritisch
- **Echte Seed-Daten**: `assets/static/{airports,airlines,aircraft}.json`
  enthalten zusammen 8 Airports, 6 Airlines, 6 Aircraft (≈3 KB). Der README
  spricht von „Symlinks/Kopien zu `/data/processed/`" — `data/` existiert
  weder im Repo-Root noch außerhalb. Ohne echte Daten kann der User keinen
  Flughafen außerhalb der 8 Hardcodierten suchen (FRA, MUC, BER, LHR, CDG, JFK,
  LAX, HND). Trazia ist faktisch eine Demo.
- **Train-Seed**: keine `train_stations.json` / `train_operators.json` /
  `trains.json`. Wenn die in der Phase-8.1-Aktivierung angepriesene Train-
  Funktion aktiv wäre, gäbe es nichts auszuwählen.
- **TrainForm**: `src/components/domain/AddJourney/TrainForm.tsx` existiert
  nicht. `journeySchemas.ts` enthält nur `flightFormSchema` und
  `otherFormSchema` (für walk/bike/other). Phase 8.1 ist UI-seitig **nicht**
  umgesetzt — `ModePicker` zeigt Train weiter mit `enabled: false` /
  `comingIn: 'Phase 2'`.
- **Achievement-Catalog vollständig**: `docs/achievements.json` enthält 22
  Achievements. Spec verlangt 32 (Phase 1, Flug) + 18 (Phase 2, Train).
  Speziell fehlen die im manuellen Test-Drehbuch erwarteten:
  `first_flight`, `first_train`, `transatlantic` (es gibt `atlantic_crosser`),
  `jumbo_jet`, `long_haul` (es gibt `long_haul_8000`).
- **DB-Indizes auf `journeys.cabinClass`** fehlen. Für die `cabin_class`-
  Achievement-Regel und Filter ist das egal (Tabelle wird sowieso fully
  scanned), aber die Spec listet sie auf.

### Mittel
- **`/data/processed/`-Pipeline**: keine Dokumentation, wie Tim die echten
  IATA-/OurAirports-/EuroStat-Daten reinbekommt. README erwähnt die Stelle,
  liefert aber keinen Import-Script.
- **Logos / Assets**: `assets/images/` enthält App-Icon-Zeug, aber **keine
  Airline-Logos**, obwohl `operators.logoPath` im Schema ist und
  `revenuecat.ts` bullets „Airline-Logos" suggerieren.
- **i18n englischer Strings**: das ProfileScreen, FlightForm etc. mischen
  hardcoded deutsche Strings ohne `t('...')`-Aufruf. `src/i18n/` existiert,
  wird aber nirgends importiert (außer im index).
- **Trips/Kombinationen**: Tabelle `trips` und `tripJourneys` existieren,
  aber kein UI; die JourneyActionSheet-Aktion `'add_to_trip'` zeigt
  „Trips kommen in CC-3.9".

### Klein
- `drizzle/`-Output-Ordner steht im README als Migrations-Ziel; tatsächlich
  liegen die Migrations in `src/db/migrations/`. Inkonsistent — Doku oder
  Konfig anpassen.
- `src/lib/routes/index.ts` existiert, ist aber laut Phasen-Prompts für
  Realistic-Routes (Phase 3+) — kein Inhalt vorhanden.

## EXTRA (im Repo, in keiner Phase erwähnt)

- `RELEASE_CHECKLIST.md` (selbst angelegt) — nützlich, lassen.
- `app-example/` ist im `.gitignore` enthalten, existiert aber nicht. Reste
  vom Expo-Template.
- Drizzle-Migrations-Ordnerstruktur unter `src/db/migrations/meta/` — okay,
  drizzle-kit erzeugt das so.
- `nativewind-env.d.ts`, `expo-env.d.ts` (ignored) — okay.

## Empfehlung

Bevor Phase 9 (Auto) ausgerollt wird, müssen die echten Seed-Daten und der
Train-Stack importiert werden — ohne das ist die App ein optisch hübscher Ego-
Container ohne Inhalt. Entweder:
1. Den `/data/processed/`-Pipeline-Stand bauen (Skript + Symlink), oder
2. Vollständige `airports.json` (≈8 000 Einträge), `airlines.json` (≈400)
   und `aircraft.json` (≈300) direkt in `assets/static/` ablegen. Bundle-
   Größe steigt, aber das ist akzeptabel für einen lokalen Reise-Logger.
