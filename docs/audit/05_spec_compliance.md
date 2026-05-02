# A5 — Spec-Compliance Phase-für-Phase

Quellen: Phasen-Prompts (im User-Audit-Auftrag zitiert), README,
`docs/achievements.json`, Datenbank-Schema, sichtbarer UI-Code.

## Phase 1 — Flug

| Spec-Punkt | Status | Notiz |
| --- | --- | --- |
| 32 Achievements für Flug | ❌ FEHLT | `docs/achievements.json` enthält 22 Achievements, davon nicht alle flug-spezifisch. Spec-genannte fehlen: `first_flight`, `transatlantic` (es gibt `atlantic_crosser` ≠), `jumbo_jet`, `long_haul` (es gibt `long_haul_8000`). |
| Engine-Rule-Types | ✅ KOMPLETT | 15 rule-types implementiert: count, distance_total, single_journey_distance, single_journey_duration, geo_condition, date_match, vehicle_category, operator_set, route_repeat, operator_loyalty, different_count, time_window, cabin_class, season_complete, month_complete |
| Flug-Form (Von/Nach/Datum/Airline/Flugnr/Aircraft/Sitz/Klasse/Notizen/Foto/Begleitung/Tags) | ✅ | `FlightForm.tsx` deckt alle Felder ab. |
| Geo-Calc (Haversine, GreatCircle, Bearing) | ✅ | `lib/geo` mit Tests gegen FRA-JFK, FRA-MUC, NRT-LAX, AKL-MAD, SCL-FRA, LHR-LYR. |
| 3D-Globe | ⚠️ FAKE | `Globe3D.tsx` ist 2.5D-SVG-Placeholder. Linien sind **nicht tappbar** (kein onPress auf `<Path>`). Echter 3D-Globus ist als CC-3.5 dokumentiert. |
| 2D-Map (react-native-maps) | ✅ | `MapView2D.tsx`. Polylines sind tappbar → JourneyDetail. Pin-Klick öffnet Modal mit Statistik. |
| Stats-Aggregation | ✅ | aggregateStats, statsByYear, statsByMode, topRoutes, topOperators. Tests in `lib/stats/__tests__/stats.test.ts`. |
| Year-in-Review | ✅ | `app/(tabs)/stats/year-in-review.tsx` + `YearInReviewTeaser.tsx` (Premium-gated). |
| Confetti / Toast bei Achievement-Unlock | ✅ | `AchievementToast.tsx` + `ConfettiLayer.tsx` + `react-native-confetti-cannon`. |
| Sound-Chime | ⚠️ STUB | `lib/sound.ts` ist Stub, expo-audio noch nicht angeschlossen. Setting im Profil hat trotzdem Toggle. |

## Phase 8.1 — Train (laut Auftrag „aktiviert")

**Tatsächlicher Stand: NICHT umgesetzt.**

| Spec-Punkt | Status | Notiz |
| --- | --- | --- |
| ModePicker schaltet Train frei | ❌ | `MODES` in `ModePicker.tsx`: `train: enabled: false, comingIn: 'Phase 2'`. |
| TrainForm | ❌ | Datei fehlt. `add.tsx` rendert nur `<FlightForm />` oder `<OtherForm />`. |
| Train-Schema (Zod) | ❌ | `journeySchemas.ts` enthält nur flight + other. |
| Bahnhof-Seed (Locations type='station' + IBNR) | ❌ | `assets/static/` enthält nur airports.json. Schema-Spalte `ibnr` ist da, leer. |
| Train-Operator-Seed (DB, ÖBB, …) | ❌ | `airlines.json` ist 6 Einträge. Keine Bahn-Operatoren. |
| Train-Vehicle-Seed (ICE 4, IC 2, …) | ❌ | `aircraft.json`. Keine Train-Klassen. |
| 18 Train-Achievements (z. B. `first_train`) | ❌ | Keine train-spezifischen Achievements im Catalog. |
| Train-spezifisches Card-Layout | ❌ | `JourneyCard.tsx:119` markiert mit `// TODO Phase 2`. Nutzt generisches Layout. |

**Fazit Phase 8.1:** Im Auftrag steht „Phase 8.1 (Züge aktiviert)" — die
Codebase widerspricht dem komplett. Wenn das im Auftrag eine Erwartungs-Aussage
war, ist das ein **Verständnis-Fehler**: Train ist nirgends aktiviert. Wenn
es eine offene Aufgabe war, ist sie **nicht erledigt**.

## Datenmodell

| Spec-Tabelle | Status | Notiz |
| --- | --- | --- |
| `locations` | ✅ | id, name, city, country, lat, lng, type, iata, icao, ibnr, unlocode, isSystemSeed + Indizes auf iata, icao, ibnr, unlocode, type |
| `operators` | ✅ | id, name, code, modes (json), country, logoPath, isSystemSeed + Index auf code |
| `vehicles` | ✅ | id, mode, code, category, manufacturer, model, capacity, isSystemSeed + Index auf code |
| `journeys` | ✅ | alle Spec-Felder vorhanden inkl. parentJourneyId für multi-leg, routePointsJson, weather, rating |
| `journey_companions` | ✅ | composite PK (journeyId, companionName) |
| `journey_tags` | ✅ | composite PK (journeyId, tag) |
| `journey_photos` | ✅ | id, journeyId, photoUri |
| `trips` + `trip_journeys` | ✅ DB / ❌ UI | DB-Tabelle vorhanden, kein UI; ActionSheet zeigt „Trips kommen in CC-3.9" |
| `achievement_unlocks` | ✅ | id, achievementId (mit unique-Index!), unlockedAt, triggeringJourneyId |

### Bemerkungen
- `achievement_unlocks_achievement_id_unique` als UNIQUE index ist **gut gewählt** —
  verhindert doppelte Unlocks. Die Engine in `engine.ts` filtert sowieso vorab,
  aber zweiseitiger Schutz ist solide.
- Foreign-Key auf `journeys.fromLocationId/toLocationId` mit `onDelete: 'restrict'`
  bedeutet: Das Löschen einer System-Location würde fehlschlagen. Sinnvoll für
  Datenintegrität, aber Backup-Restore (`backup/index.ts`) löscht **erst** alle
  child-Tabellen, **dann** Locations. Das funktioniert bei FK_RESTRICT nur,
  wenn `journeys` schon weg ist. Reihenfolge im Code ist korrekt — gut.
- **Index auf `journeys.cabinClass` fehlt**, aber für die Achievement-Auswertung
  egal (Engine läuft sowieso über alle Journeys).

## UI-Screens

| Screen | Status | Notiz |
| --- | --- | --- |
| Tabs (map, journeys, stats, profile) | ✅ | `_layout.tsx` mit Ionicons-Tabs |
| Map (3D/2D-Toggle) | ⚠️ | 3D ist Default, 3D-Linien sind aber nicht tappbar. |
| JourneysListe (Filter, Search, Sections, Swipe-Delete) | ✅ | SectionList nach Jahr/Monat, Filter-Sheet, Swipe-Delete, Long-Press-ActionSheet. |
| JourneyDetail | ✅ | `app/(tabs)/journeys/[id].tsx` (Lese-Probe ausstehend, aber referenziert von Map+List). |
| **JourneyEdit** | ❌ PLATZHALTER | `journeys/edit/[id].tsx` zeigt nur „Kommt in CC-3.5". |
| AddJourney | ✅ Flug + Other; ❌ Train/Auto/Schiff | siehe Phase 8.1 |
| Stats-Hauptscreen | ✅ | Hero, QuickNumbers, MoonProgress, TopRoutes, Charts, YearInReviewTeaser, AchievementsSection |
| **Stat-Drilldown** (`stats/stat/[key].tsx`) | ❌ PLATZHALTER | „Kommt in CC-3.6". |
| Achievement-Detail (`stats/achievement/[id].tsx`) | ✅ (Lese-Probe ausstehend) |
| Year-in-Review | ✅ | Premium-gated. |
| Profil | ✅ | Theme/Sprache/Einheiten/Sound/Notifs/Crash/Analytics-Toggles, Premium-CTA, Daten-Export, Backup, Legal-Links, Feedback-Mailto. |
| Profil → Premium | ✅ | Paywall-Screen mit Mock-Toggle. |
| Profil → Export | ✅ | PDF + CSV + JSON. |
| Profil → Backup | ✅ | writeBackupFile + restoreFromBackup. |
| Profil → About / Privacy / Terms / Imprint | ✅ | Markdown-Loader. |
| Onboarding (welcome, modes, first-journey, permissions) | ⚠️ | UI vorhanden, aber **first-journey** trägt **keine** Beispielreise ein — beide Buttons springen zu Permissions. „HAM → FRA" ist außerdem nicht im Seed enthalten. |

## Privacy & Legal

| Punkt | Status |
| --- | --- |
| Datenschutzerklärung (DE) | ✅ vorhanden, Markdown |
| AGB (DE) | ✅ |
| Impressum (DE) | ✅ |
| Privacy-Toggle Crash-Reports | ✅ Settings-Store + Sentry-`beforeSend` |
| Privacy-Toggle Analytics | ✅ Default `false` (opt-in), PostHog mit anonymous UUID |
| ATT (App Tracking Transparency) | ✅ `expo-tracking-transparency` Plugin in app.json |
| iOS Privacy Manifest | ✅ NSPrivacyAccessedAPIType deklariert (UserDefaults, FileTimestamp) |
| Android blocked permissions | ✅ Location-Permissions blockiert |

## Spec-Lücken Kurz-Liste (zum Aufnehmen ins Summary)

1. Echte Seed-Daten (Airports/Airlines/Aircraft) — nur Sample.
2. Phase 8.1 Train: nicht umgesetzt (UI, Form, Schema, Seed, Achievements).
3. 32 Achievements für Phase 1 — nur 22 vorhanden, mehrere Spec-IDs fehlen.
4. Journey-Edit: Placeholder.
5. Stats-Drilldown: Placeholder.
6. 3D-Globus: Placeholder, Tap nicht implementiert.
7. Sound-Stub statt expo-audio.
8. Trips-UI: nicht umgesetzt (DB-Schema da).
9. Onboarding First-Journey: legt keine Beispielreise an.
10. i18n-Subsystem: ungenutzt; Sprachschalter im UI tut nichts.
