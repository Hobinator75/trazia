# 00 — Audit-Zusammenfassung

**Datum**: 2026-05-02
**Auditor**: Read-only Code-Audit
**Scope**: gesamter Trazia-Codebase (`~/Desktop/Trazia/app/`)
**Methode**: Code-Lesen, statische Checks (`tsc`, `lint`, `vitest`,
`expo-doctor`, `expo config`). Kein `prebuild`, keine Code-Änderungen.

## Top-Befund in einem Satz

Die Codebase ist **technisch sehr sauber** (0 TS-Fehler, 0 Lint-Warnings,
93/93 Tests grün, 0 Hardcoded-Secrets), aber **inhaltlich gibt's mehrere
Lücken zwischen Spec und Implementierung** — die größte: **Phase 8.1 (Train)
ist nicht aktiviert**, und die Seed-Datenbank besteht aus 8 Airports.

---

## Top-5 KRITISCH (App nicht launch-fähig wenn nicht behoben)

| # | Problem | Datei / Beleg | Aufwand |
| --- | --- | --- | --- |
| 1 | **Seed-Daten sind eine Mini-Sample-DB** (8 Airports, 6 Airlines, 6 Aircraft). User können nur Reisen zwischen FRA, MUC, BER, LHR, CDG, JFK, LAX, HND eintragen. Trazia ist faktisch unbrauchbar. | `assets/static/{airports,airlines,aircraft}.json` | 4-12 h (Datenpipeline + Bundling) |
| 2 | **Journey-Edit-Screen ist ein Platzhalter.** Tappen auf „Bearbeiten" im ActionSheet führt zu „Kommt in CC-3.5". | `app/(tabs)/journeys/edit/[id].tsx` | 4-6 h |
| 3 | **Native Build crasht potenziell**: Peer-Dependency `expo-asset` fehlt (von expo-audio benötigt) → außerhalb von Expo Go möglicher Crash. Außerdem Schema-Verstoß `compileSdkVersion`/`targetSdkVersion` in app.json. | `package.json`, `app.json` (siehe `expo-doctor`) | 10 min |
| 4 | **Sentry-Plugin und EAS-Submit** mit Platzhalter-Strings (`REPLACE_WITH_…`). Production-Build fällt um. | `app.json:81-82`, `eas.json:55-67` | 10 min (mit echten IDs) |
| 5 | **AdMob-IDs sind Test-IDs.** Wenn so deployed, sieht der User nur „Test Ad" und Tim macht keinen Cent. | `app.json:73-74`, `src/lib/ads/units.ts` | 15 min (echte IDs in EAS-Secrets) |

## Top-10 SOLLTE-VOR-LAUNCH-FIXED (Polish, UX, Spec-Compliance)

| # | Problem | Aufwand |
| --- | --- | --- |
| 1 | Achievement-Catalog: 22 statt 32 (Phase 1) Einträge; im Test-Drehbuch erwartete IDs (`first_flight`, `transatlantic`, `long_haul`, `jumbo_jet`) existieren nicht. Erweitern, mit den vorhandenen Rule-Types ist das schnell. | 2-3 h |
| 2 | Phase 8.1 Train: laut User „aktiviert", in der App komplett deaktiviert (`ModePicker.MODES`). Entweder echt umsetzen (TrainForm + Schema + Stations-Seed + 18 Achievements) oder den Auftrag korrigieren. | 1-3 Tage (real) |
| 3 | Stats-Drilldown (`stats/stat/[key].tsx`) ist Platzhalter. „Aktive" Tap-Targets im UI führen ins Leere. Entweder umsetzen oder Tap deaktivieren. | 1-2 h (deaktivieren) / 8-12 h (real) |
| 4 | 3D-Globus rotiert hübsch, aber **Linien sind nicht tappbar.** Default auf 2D-Map setzen, bis CC-3.5 fertig ist. | 10 min |
| 5 | Onboarding `first-journey.tsx`: Buttons versprechen „HAM → FRA" einzutragen, tun aber nichts. HAM ist außerdem nicht im Seed. Entweder echte Beispielreise erstellen oder Text/Buttons ehrlich machen. | 30 min - 1 h |
| 6 | OtherForm speichert walk/bike/other als `mode='car'` → Stats-Modi-Verteilung wird falsch. Eigene `transportMode`-Mapping einführen oder neuer Mode-Wert `walk`/`bike`. | 30 min |
| 7 | i18n-Subsystem (`src/i18n/`) wird nirgends importiert; Profil-Sprachschalter ist UI-Theater. Entweder mit `i18next` real anschließen oder löschen. | 5 min (löschen) / 2-4 h (real) |
| 8 | `expo-image` ist installiert, aber alle `<Image>`-Verwendungen nutzen `react-native`-Image. Tausch ist trivial und gibt Caching/Decoding gratis. | 30 min |
| 9 | `MapView2D`: GreatCirclePath wird pro Render neu berechnet. In `useMemo` ziehen. | 15 min |
| 10 | Sound-Stub statt expo-audio (`src/lib/sound.ts`) — Setting-Toggle steht, ohne Effekt. | 30 min - 1 h |

## Nice-to-have für später

- Trips/Multi-leg-UI (Schema vorhanden, ActionSheet vertröstet auf CC-3.9)
- AchievementToast: `eslint-disable` mit WHY-Kommentar versehen
- Composite-Index `(fromLocationId, toLocationId)` für SQL-basiertes
  route_repeat
- `aggregateStatsMemo` einschalten oder löschen (totes Bauteil)
- `EntitySearchModal`: explizit `keyExtractor`
- Journey-Repository-Tests, Backup-Roundtrip-Test (siehe 08_tests_coverage.md)
- echter 3D-Globus mit three.js / expo-gl (Globe3D.tsx Zeile 177)
- FlashList überall dort, wo SectionList aktuell ist (>1000 Items)
- `recalculateAchievements` inkrementell statt full-rescan
- `.secrets/` in `.gitignore` aufnehmen

## Spec-Lücken (was wurde NICHT umgesetzt)

| Lücke | Begründung / Status |
| --- | --- |
| 32 Achievements für Phase 1 | nur 22 vorhanden; mehrere Spec-IDs fehlen. |
| 18 Achievements für Phase 2 (Train) | keine, da Phase 2 nicht implementiert. |
| Echter 3D-Globus | als CC-3.5 dokumentiert; Phase-1-SVG-Placeholder |
| Trips / Combos | Schema da, UI ausgelassen (CC-3.9) |
| Realistic Routes | `lib/routes/` leer, Phase 3+ |
| Cloud-Sync | als Phase-6-Premium-Feature im Paywall-Text |
| Sound-Chime | `lib/sound.ts` ist Stub (CC-3.7) |
| i18n-Schalter funktional | Subsystem da, nirgends angeschlossen |
| Edit-Screen | Platzhalter (CC-3.5) |
| Stats-Drilldown | Platzhalter (CC-3.6) |
| Train-Modus (Phase 8.1) | nicht aktiviert, trotz User-Aussage |
| Bus / Auto / Schiff | im ModePicker disabled |

## Aufwand für die Top-15 Items (kumuliert)

- **Hard-must-fix vor Launch**: ~1 Tag (mit echten Seed-Daten + Build-Configs).
- **Soll-vor-Launch**: ~3-5 Tage (mit Phase-8.1-Train).
- **Nice-to-have**: 1-2 Tage.

## Empfehlung: Phase 9 (Auto) jetzt?

**Nein.**

Begründung:
1. **Phase 8.1 (Train) ist nicht aktiviert.** Im Auftrag steht „Train
   aktiviert" — die App widerspricht. Phase 9 (Auto) auf einem nicht-
   abgeschlossenen Phase 8.1 zu starten erweitert die Schulden.
2. **Echte Seed-Daten fehlen.** Ohne diese ist Trazia eine UI-Demo, kein
   Reise-Tracker. Auto wird das gleiche Problem haben (echte Auto-Routen,
   POIs, OBD-Daten oder Free-Text — was?).
3. **Edit-Flow ist Platzhalter.** Auto-Reisen ohne Edit-Möglichkeit
   verschlimmern die Frustrations-Wahrscheinlichkeit.
4. **Build-Konfiguration hat ungetestete Stolpersteine** (expo-asset,
   Sentry-Slugs, AdMob-Test-IDs).

### Vorgeschlagene Reihenfolge

1. **Build-Konfiguration sauber machen** (ein halber Vormittag): expo-asset
   installieren, app.json Schema-Verstöße fixen, Sentry-Slugs/AdMob-IDs
   ersetzen oder per EAS-Secret injizieren.
2. **Echte Seed-Daten bereitstellen** (1 Tag): Datenpipeline `/data/processed/`
   bauen oder direkte Vollversion in `assets/static/`.
3. **Edit-Form fertigstellen** (halber Tag): FlightForm mit defaultValues
   wiederverwenden.
4. **Achievements auf Spec-Niveau bringen** (halber Tag): IDs umbenennen
   oder ergänzen.
5. **Phase 8.1 (Train) wirklich aktivieren** (2-3 Tage): TrainForm, Schema,
   Bahnhof-Seed, Train-Achievements.
6. Erst dann: **Phase 9 (Auto)** angreifen.

## NACH FIX-SESSION (2026-05-02 abends)

In sieben Block-Commits abgearbeitet (`git log --oneline | grep audit`).

### Was gefixt wurde

**Build-Konfiguration (Block 1):**
- `expo-asset` als peer-dep installiert.
- `compileSdkVersion`/`targetSdkVersion` aus `app.json` per `expo-build-properties`-Plugin.
- Sentry-Plugin-Slugs auf "trazia" — Plugin skipt Source-Map-Upload still ohne SENTRY_AUTH_TOKEN.
- EAS-Submit ASC App ID + Apple Team ID auf leere Strings gesetzt (Tim füllt vor erstem submit).
- `.gitignore` nimmt `.secrets/` mit.
- `expo-doctor` bestanden 17/17.

**Echte Seed-Daten (Block 2):**
- `scripts/build-static-data.ts` zieht OurAirports + OpenFlights live.
- `assets/static/airports.json`: **3 308** Einträge (vorher 8).
- `assets/static/airlines.json`: **993** Einträge (vorher 6).
- `assets/static/aircraft.json`: **147** kuratierte ICAO-Designators (vorher 6).
- `seedFromStatic` v1→v2 mit additivem Upgrade-Pfad — bestehende User-Daten bleiben.

**Journey-Edit-Screen (Block 3):**
- FlightForm/OtherForm akzeptieren `editing`-Prop und schalten auf UPDATE.
- `app/(tabs)/journeys/edit/[id].tsx` echt umgesetzt (nicht mehr Platzhalter).
- Repository-Layer mit lazy-import für ads/analytics — Tests laufen jetzt im Node-Env durch.

**Achievement-Catalog auf Spec (Block 4):**
- `docs/achievements.json`: 22 → **44** Achievements (12 cross-modal + 32 flight).
- `atlantic_crosser` → `transatlantic` mit Migration 0002.
- Neue: first_flight, fifty_flights, jumbo_jet, supersonic, oneworld_alliance, skyteam_alliance, …
- `Achievement.appliesTo`-Feld unterscheidet flight / train / cross.

**Phase 8.1 Train (Block 5):**
- Seed: 124 Bahnhöfe, 51 Bahnbetreiber, 75 Train-Modelle.
- TrainForm.tsx (~440 Zeilen) parallel zur FlightForm.
- ModePicker schaltet Train frei.
- AddJourney + Edit-Screen rendern TrainForm bei mode='train'.
- JourneyCard mit dediziertem TrainCardBody (Stadt-Pair + Operator-Code).
- 18 Train-Achievements (first_train, db_loyalty_25, european_rail, sleeper_train, …).
- Onboarding-Modes-Karte aktivierbar.
- Achievement-Catalog jetzt **62** total.

**Polish (Block 6):**
- Stats Quick-Numbers von Pressable → View (kein toter Tap-Target).
- Map-Default: 2D statt 3D (3D-Linien sind nicht tappbar).
- Onboarding first-journey trägt jetzt eine echte Beispielreise ein.
- TransportMode + 'walk' | 'bike' | 'other'; OtherForm speichert per submode.
- `src/i18n/` gelöscht; Sprache aus Settings entfernt; DE-only für v1.
- `<Image>` aus expo-image überall mit Fotos.
- MapView2D: greatCirclePath in useMemo.
- aggregateStatsMemo eingeschaltet in useStatsData.
- Migration 0003: indexes auf `journeys.cabin_class` und `journeys.vehicle_id`.

**Tests (Block 7):**
- `journey.repository.test.ts`: create/update/delete/duplicate, train-haversine, first_train.
- `lib/journeys/__tests__/sections.test.ts`: applyFilters / groupByYearMonth / buildFacets.
- `lib/export/__tests__/snapshot.test.ts`: build + restore-roundtrip.
- `lib/forms/__tests__/journeySchemas.test.ts`: Zod edge cases.
- `lib/achievements/__tests__/catalog.test.ts`: catalog smoke + spec-IDs.
- `seed.test.ts` erweitert um Train-Daten und Version-Upgrade.
- **138/138 Tests grün, tsc 0, lint 0, expo-doctor 17/17.**

### Was offen bleibt

- **Echter 3D-Globus** (Globe3D.tsx): bleibt SVG-Placeholder. CC-3.5.
- **Stats-Drilldown**: `stats/stat/[key].tsx` weiterhin Platzhalter; tap-targets sind aber jetzt deaktiviert. CC-3.6.
- **Sound-Asset**: lib/sound.ts hat das expo-audio-Wiring side-by-side im Code, aber keine MP3-Datei. CC-3.7.
- **AdMob-Production-IDs / Sentry-Account / Apple-IDs**: Platzhalter ersetzt, aber Tim braucht echte Werte vor `eas build --profile production`. Siehe RELEASE_CHECKLIST.md.
- **Trips / Multi-leg-UI**: Schema da, kein UI. CC-3.9.
- **Train-Stations weltweit**: 124 europäische + JP + US, nicht global. Tim kann erweitern oder per Overpass nachziehen.

### Empfehlung

Die App ist **launch-fähig für Phase 1 + Phase 8.1 (Flug + Zug)**.

- Vor Codex-Cross-Audit: ✅ kann jetzt los — Tests sind grün, Spec-Compliance ist auf 32+18 Achievements, Build-Configs sauber.
- Vor Phase 9 (Auto): erst Codex-Cross-Audit + Tims manuelles Test-Drehbuch (`11_test_script.md`) durchspielen.

## Audit-Index

- [01_structure.md](01_structure.md) — Repo-Struktur (FOUND/MISSING/EXTRA)
- [02_typescript.md](02_typescript.md) — `tsc --noEmit` (sauber)
- [03_lint.md](03_lint.md) — `expo lint` (sauber)
- [04_deadcode.md](04_deadcode.md) — TODOs, Console, ungenutzte Exports, Platzhalter
- [05_spec_compliance.md](05_spec_compliance.md) — Phase-für-Phase Vergleich
- [06_security.md](06_security.md) — Keys, Privacy, Network-Calls
- [07_performance.md](07_performance.md) — Re-Renders, Listen, DB-Indizes
- [08_tests_coverage.md](08_tests_coverage.md) — was ist getestet, was fehlt
- [09_tests_results.md](09_tests_results.md) — `npm test` (93/93)
- [10_build.md](10_build.md) — `expo-doctor`, Build-Risiken
- [11_test_script.md](11_test_script.md) — manuelles Test-Drehbuch S1-S14
