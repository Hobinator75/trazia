# C2 — Manuelles Test-Drehbuch

Dieses Drehbuch ist für Tim zum Durchspielen auf einem echten Gerät (oder
mindestens iOS-Simulator + Android-Emulator). Pro Schritt:

- **Tun**: was du machen sollst
- **Erwartet**: was passieren sollte
- **Schiefgeht möglich**: typische Bugs, auf die du hier achten sollst
- **Loggen**: wo kontrollieren

> Hinweis: Tims Audit-Auftrag erwähnt „Phase 8.1 (Züge aktiviert)". Der Code-
> Audit hat festgestellt, dass Train **nicht** aktiviert ist (siehe
> 05_spec_compliance.md). Szenario S8/S9 wird daher voraussichtlich
> auf einer Lock-Snackbar enden — das ist der wichtigste Lerngegenstand des
> manuellen Tests.

---

## S1 — Erster App-Start (Onboarding, Seed)

**Tun:**
1. App komplett deinstallieren (oder Dev-Build mit fresh data starten,
   z. B. via „Wipe All Data" im Profil falls die App schon mal lief).
2. App starten.

**Erwartet:**
- Splash → Welcome-Onboarding (Trazia-Logo mit pulsierendem Mini-Globe)
- „Loslegen" → Mode-Auswahl (nur „Flug" sollte aktivierbar sein, andere mit Lock-Icon)
- → first-journey („HAM → FRA Beispiel" — siehe Schiefgeht)
- → permissions → fertig
- → Map-Tab als Start (initialRouteName="map")
- DB-Seed läuft 1× durch: 8 Airports, 6 Airlines, 6 Aircraft (siehe
  01_structure.md — das ist die Mini-Sample-Datenbank!)

**Schiefgeht möglich:**
- ❌ **first-journey-Screen ist misleading**: zeigt „Hamburg nach Frankfurt"
  als Beispielreise, aber **beide Buttons** („Klar, leg los" + „Überspringen")
  springen zur permissions-Seite, **ohne irgendetwas einzutragen**. Tim wird
  in der Reisen-Liste null Reisen sehen, obwohl die UI Versprechen gemacht hat.
- HAM (Hamburg) ist **nicht** im Seed.
- DB-Initialisierung kann hängen, wenn `expo-asset`-peer fehlt (siehe 10_build).

**Loggen:**
- Sentry: noch nichts (DSN nicht gesetzt) — DEV-Console: `[Sentry stub] would
  capture: …` falls Crash.
- PostHog: Erst nach Opt-in im Profil. Default OFF.

---

## S2 — Flug eintragen (FRA → JFK, LH, B748)

**Tun:**
1. Reisen-Tab → Plus-Button (rechts unten) → Modus „Flug" ausgewählt.
2. „Von" tippen → Search → „FRA" → wählen.
3. „Nach" tippen → „JFK" → wählen.
4. Datum: heute (default).
5. Airline „Lufthansa" suchen → wählen.
6. Flugnummer: `LH441`.
7. Aircraft-Type: **B748** suchen.
8. Sitzplatz `21A`, Klasse Business, Notizen, Foto, Tags.
9. „Reise speichern" tippen.

**Erwartet:**
- Distanz wird ausgerechnet (Haversine) → ~6204 km gespeichert.
- Erfolg-Snackbar „Reise gespeichert", router.back().
- Reise erscheint in der Liste (FRA → JFK).

**Schiefgeht möglich:**
- ❌ **Aircraft B748** ist **nicht** in `assets/static/aircraft.json`. Tim
  wird nur B738, B77W, A320, A21N, A359, B789 finden. „Boeing 747-8" ist
  nicht da. Wähle ersatzweise B77W (widebody).
- Distanz kann fehlen, wenn fromLocation oder toLocation null geliefert wird
  (sollte aber nicht passieren, weil aus DB geladen).
- Foto-Picker: erfordert Permission. Bei Verweigerung: Snackbar
  „Foto-Zugriff verweigert".

**Loggen:**
- DEV-Console: `[analytics stub] journey_added { mode: flight }` falls
  analyticsEnabled=true (default OFF).

---

## S3 — Erstes Achievement triggern

**Tun:**
- Nach Speichern von S2 prüfen, welche Achievements freigeschaltet werden.

**Erwartet** (laut User-Auftrag): `first_flight + transatlantic + long_haul +
jumbo_jet`.

**Tatsächliches Verhalten** (laut Code-Audit):
- ❌ `first_flight` existiert **nicht**. `first_journey` (count >=1) wird
  freigeschaltet — das ist das nächste Äquivalent.
- ❌ `transatlantic` existiert **nicht**. `atlantic_crosser` (geo_condition
  atlantic) wird freigeschaltet (FRA→JFK kreuzt den Atlantik).
- ❌ `long_haul` existiert **nicht**. `long_haul_8000` braucht ≥8000 km;
  FRA-JFK ist nur 6204 km → **wird NICHT freigeschaltet**.
- ❌ `jumbo_jet` existiert **nicht**. `widebody` (vehicle_category) wird
  freigeschaltet, wenn Aircraft = B77W gewählt wurde.

Erwartete tatsächliche Unlocks: `first_journey`, `atlantic_crosser`,
optional `widebody` (wenn widebody Aircraft).

**Schiefgeht möglich:**
- AchievementToast erscheint per Confetti — falls nicht: prüfen, ob
  `recalculateAchievements` (in journey.repository) wirklich läuft. Workflow
  sollte sein: createJourney → recalculateAchievements → store.appendUnlocks
  → AchievementToast subscribed → animiert.
- Sound spielt **nicht** (Stub, siehe 04_deadcode.md).

**Loggen:**
- DEV-Console: keine Errors. Stats-Tab → Erfolge → 2-3 Tiles freigeschaltet.

---

## S4 — Mehrere Flüge eintragen, Stats prüfen

**Tun:**
1. 3-5 weitere Flüge zwischen vorhandenen Airports (FRA, MUC, BER, LHR,
   CDG, JFK, LAX, HND).
2. Stats-Tab öffnen.

**Erwartet:**
- HeroCard zeigt die kumulierte Distanz.
- QuickNumbersGrid: Reisen, Distanz, Stunden, Länder, Modi.
- MoonProgress: distance / 384 400 km (zur Erde-Mond-Strecke).
- TopRoutes: häufigste Strecke.
- Charts:
  - „Reisen pro Jahr" (BarChart)
  - „Modi-Verteilung" (PieChart, 100% Flug solange Phase 1)
  - „Distanz pro Monat" (LineChart, laufendes Jahr)

**Schiefgeht möglich:**
- BarChart braucht mind. ein Jahr mit Daten — sieht bei nur dem aktuellen
  Jahr trivial aus.
- LineChart zeigt 12 Monate, auch leere; vorgesehen als rolling.

**Loggen:**
- Stats-Tab refresht via `useFocusEffect` (in `useStatsData`).

---

## S5 — 3D-Globus → tap → JourneyDetail → Edit

**Tun:**
1. Map-Tab öffnen (Default: 3D).
2. Linie zwischen FRA und JFK suchen.
3. Linie tippen.
4. Im JourneyDetail „Bearbeiten" antippen.

**Erwartet:**
- 3D-Linie öffnet JourneyDetail.
- JourneyDetail zeigt RouteHero + MapPreview + Felder.
- „Bearbeiten" öffnet die Edit-Form, vorausgefüllt.

**Schiefgeht möglich:**
- ❌ **3D-Linie ist nicht tappbar.** `Globe3D.tsx` rendert `<Path>`-SVG-
  Elemente ohne onPress-Handler. Tap ins Leere. **Workaround**: oben rechts
  auf 2D umschalten — `MapView2D.tsx` hat `tappable onPress` auf den
  `<Polyline>`s und pusht zu `/journeys/[id]`.
- ❌ **Edit-Screen ist Platzhalter.** `app/(tabs)/journeys/edit/[id].tsx`
  zeigt nur „Bearbeitungs-Form für Reise {id}. Kommt in CC-3.5."
- Long-Press auf JourneyCard öffnet ActionSheet → „Bearbeiten" → derselbe
  Platzhalter.

**Loggen:**
- Keine Errors, einfach „nichts passiert". Das ist der frustrierende
  Failure-Mode.

---

## S6 — Filter / Search testen

**Tun:**
1. Reisen-Tab.
2. Such-Feld: „FRA" → nur FRA-Routen sichtbar?
3. Filter-Icon (oben rechts) → Mode/Year/Operator/Country filtern.

**Erwartet:**
- Search filtert auf Stadt/Code/Airline (siehe `applyFilters` in
  `lib/journeys/sections.ts`).
- Filter-Sheet hat Multi-Select-Chips für jeden Facet-Typ.
- Kombination Search + Filter zeigt Schnitt.

**Schiefgeht möglich:**
- Empty-State zeigt „Keine passenden Reisen" wenn Filter leer match. Gut.
- Long-Press auf eine gefilterte Karte öffnet ActionSheet → Edit ist
  Platzhalter.

**Loggen:**
- Keine analytics-Events für Filter (laut Code).

---

## S7 — Offline-Modus

**Tun:**
1. WLAN + Mobilfunk aus.
2. App schließen, neu öffnen.
3. Reise eintragen, Filter benutzen, Stats anschauen.

**Erwartet:**
- Komplett funktionsfähig — Daten sind in `expo-sqlite/trazia.db` lokal.
- AdMob-Banner: leer / fehlt (kein Netz, kein Banner). Kein Crash.
- Sentry/PostHog: Events queuen lokal, werden bei Reconnect geflushed
  (PostHog) oder verworfen (Sentry stub).

**Schiefgeht möglich:**
- AdMob-SDK kann beim Init Timeouts werfen — code in `lib/ads/index.ts:configureAds`
  fängt das mit try/catch, returns `{available: false}`.
- Restore-from-Backup ist offline OK (lokales JSON).

**Loggen:**
- Funktioniert, oder Crash → Sentry (wenn online) / Konsole (wenn dev).

---

## S8 — Zugfahrt eintragen (Berlin Hbf → München Hbf, ICE 73, ICE 4)

**Tun:**
1. Reisen-Tab → Plus → ModePicker → „Zug" tippen.

**Erwartet** (laut User-Auftrag): TrainForm mit Bahnhof-Search (Berlin Hbf,
München Hbf), Operator (DB), ICE-Nummer, Zug-Modell (ICE 4).

**Tatsächliches Verhalten** (laut Code-Audit):
- ❌ **„Zug" ist DISABLED** im ModePicker. Tap zeigt Snackbar „Zug ist in
  Phase 2 verfügbar." (siehe `add.tsx:14-18`).
- Train-Form existiert nicht.
- Train-Stationen sind nicht im Seed.
- Train-Operatoren (DB, ÖBB) sind nicht im Seed.
- Train-Vehicles (ICE 4, IC 2) sind nicht im Seed.
- Workaround für die Zwischenzeit: „Sonstiges" → submode `other` →
  Free-Text-From/To → „Berlin" und „München". Wird intern als mode='car'
  gespeichert (siehe `OtherForm.tsx:119`), nicht als train. **Stats-Modi-
  Verteilung wird das falsch zeigen.**

**Loggen:**
- DEV-Console: `[analytics stub] mode_locked_tapped { mode: train }` (wenn
  analyticsEnabled).

---

## S9 — first_train Achievement + Stats Mode-Verteilung

**Erwartet** (User-Auftrag): `first_train` Unlock + Pie zeigt 2 Modi.

**Tatsächliches Verhalten:**
- ❌ `first_train` existiert nicht im Catalog.
- Pie zeigt nur, was in der DB ist. Wenn S8 auf „Sonstiges/other" ausgewichen
  ist: das wird als 'car' gespeichert → Pie zeigt Flug + Auto, nicht
  Flug + Zug.
- Mode-Pie zeigt korrekt nichts für Modi mit 0 Reisen (filter `value > 0`).

---

## S10 — AdMob-Banner im Free-Modus

**Tun:**
1. Sicherstellen, dass nicht Premium aktiv ist (Profil → Premium → Mock-
   Toggle „Premium AUS", oder real: nicht gekauft).
2. Reisen-Tab.
3. Stats-Tab.

**Erwartet:**
- Banner-Ad (Test-Ad, weil Test-IDs!) am unteren Rand der Reisen-Liste.
- Banner-Ad unter den Stats.
- Banner ist nur sichtbar wenn `consent.canRequestAds=true` (UMP-Form
  durchlaufen) und nicht Premium und nicht ad-free Reward aktiv.

**Schiefgeht möglich:**
- Im Simulator zeigt AdMob oft kein Test-Ad (langsames Laden, kein Account
  konfiguriert). Auf echtem Gerät sollte „Test Ad" sichtbar sein.
- Banner kann aus dem Layout fallen, wenn AdaptiveBannerAd width=0 reportet
  (selten, aber möglich am ersten Render).

**Loggen:**
- AdMob-Console: keine echten Impressionen (Test-IDs).

---

## S11 — Paywall auslösen (Export-Button tappen)

**Tun:**
1. Profil → „Daten exportieren" antippen.

**Erwartet:**
- Wenn nicht Premium: Premium-Gate (siehe `app/(tabs)/profile/export.tsx`).
- Paywall-Screen erscheint.

**Schiefgeht möglich:**
- Wenn `useOfferings()` keine Pakete liefert (Mock-IAP), zeigt der Screen
  einen Spinner. Im Mock-Modus sollte der Mock zwei Pakete liefern. Falls
  nicht: `lib/iap/mock.ts` lesen.

---

## S12 — Mock-Premium-Kauf simulieren

**Tun:**
1. Profil → Premium-CTA → „Premium AN" (im Mock-Modus-Block sichtbar).
2. Snackbar „Mock-Premium aktiv".
3. Zurück zum Profil — sollte „Trazia Premium aktiv" zeigen.

**Erwartet:**
- `usePremiumStore.isPremium=true`.
- Banner-Ads verschwinden in Reisen/Stats.
- Year-in-Review nicht mehr gegated.

**Schiefgeht möglich:**
- Banner verschwindet erst nach Tab-Wechsel, wenn der State nicht reactive
  re-rendert. Kontrollieren: Tabs sollten useIsPremium() überall im
  AdaptiveBannerAd reachen.

---

## S13 — Daten-Export funktioniert (Premium)

**Tun:**
1. Profil → Daten exportieren → PDF / CSV / JSON.

**Erwartet:**
- PDF: SVG-Karte + Cover + Stats + Top-Routen + Achievements (siehe
  `lib/export/pdf.ts`).
- CSV: Tabelle aller Journeys + Refs.
- JSON: Snapshot mit version=SNAPSHOT_VERSION.
- Share-Sheet öffnet sich (`expo-sharing`).

**Schiefgeht möglich:**
- iOS-Simulator hat manchmal kein „Mail"/„Notes" zum Teilen — Share-Sheet
  zeigt limitierte Optionen.
- PDF: SVG-Hero-Map projiziert per Equirectangular (`lib/export/pdf.ts:29`).
  Bei Routen über Antimeridian sieht das hässlich aus, aber kein Crash.

---

## S14 — Daten löschen / Restore

**Tun:**
1. Profil → Backup & Restore → JSON-Backup erstellen.
2. „Wipe All Data" mit Doppel-Bestätigung.
3. App neu starten (vom App-Switcher).
4. Restore mit dem JSON-Backup.

**Erwartet:**
- Wipe: alle Tabellen leer, AsyncStorage seed.version + onboarding gelöscht
  → App startet wieder mit Onboarding.
- Restore: Snapshot wird eingelesen, alle Journeys + Achievements wieder da.

**Schiefgeht möglich:**
- Wipe macht **nicht** das Re-Seeding rückgängig — nach Wipe + Restart läuft
  `seedFromStatic` mit `reason: 'self-heal'` und legt die 8 Airports
  wieder an. Das ist gewollt.
- Restore-Reihenfolge in `lib/backup/index.ts:100-123`: child-Tabellen
  zuerst gelöscht, dann parents — korrekt für FK_RESTRICT.
- Achtung: Restore ist destruktiv und überschreibt aktuelle Daten ohne
  weitere Bestätigung — Tim sollte vor Restore-Test ein zweites Backup
  haben.

**Loggen:**
- DEV-Console / Snackbar zeigt success/error.

---

## Globaler Sanity-Check

Nach Durchlauf von S1-S14:
- Sentry-Console (wenn DSN gesetzt): keine Errors.
- PostHog (wenn Key gesetzt + analytics opt-in): events `app_opened`,
  `journey_added`, `achievement_unlocked`, `paywall_shown`,
  `paywall_purchased`, `mode_locked_tapped`.
- App-Größe / Memory: bei <100 Reisen unauffällig; bei 1000+ Reisen siehe
  07_performance.md.
