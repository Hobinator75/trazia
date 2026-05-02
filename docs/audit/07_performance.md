# A7 — Performance-Smells

## Re-Renders / Memoization

### Gut

- `JourneyCard` ist mit `memo()` umhüllt; sub-bodies (`FlightCardBody`,
  `GenericCardBody`) ebenfalls. Bei vielen Reisen in der List bleibt das billig.
- `Stats/ChartsSection.tsx` benutzt `useMemo` für yearBarData, modePieData,
  monthlyDistanceData.
- `Globe3D.tsx`: `paths` und `projectedArcs` per `useMemo`.
- `MapView2D.tsx`: `filtered`, `locationStats`, `maxVisits`, `yearOptions` per
  `useMemo`.
- `journeys/index.tsx`: `facets`, `filtered`, `sections` per `useMemo`.
- `useStatsData.ts`: `stats` per `useMemo`.
- `lib/stats/index.ts:280` exportiert `aggregateStatsMemo` (reference-equality
  memo). Aktuell wird im Code aber `aggregateStats` direkt benutzt — die
  memoisierte Variante ist nicht angeschlossen. Kein akutes Problem (Stats
  werden nur on-focus berechnet), aber lose Bauteil.

### Smell

- **`MapView2D` re-rechnet `greatCirclePath(64)` für JEDE Polyline JEDES
  Renders.** Das ist innerhalb von `journeys.map(...)`, also beim Re-Render
  des `MapView` (z. B. bei Mode-Toggle) wird N×64 = 64 Punkte pro Reise neu
  berechnet. Bei 200 Reisen sind das 12 800 Trig-Operationen pro Render.
  Mit `useMemo` über das `path`-Array hinausziehen → < 1 ms / Render.
  **Mittel-Smell.** Datei `MapView2D.tsx:106`.

- **`Globe3D`-Animation läuft bei 60 FPS, aber die SVG wird nicht von der
  Animation getrieben.** Die Rotation rotiert die Container-View per
  CSS-transform; die Pfade selbst sind statisch (rotation=0 in `projectPath`).
  Das ist gewollt, aber Verwirrend (warum dann eine sharedValue mit
  `withRepeat`?). Kein Performance-Problem.

- **`<Image>` aus `react-native`** statt `expo-image` in:
  - `src/components/domain/ProfileHeader.tsx:54` (Avatar)
  - `src/components/domain/AddJourney/{FlightForm,OtherForm}.tsx` (Foto-Vorschau)
  - `src/components/domain/JourneyDetail/RouteHero.tsx:26`
  
  `expo-image` ist installiert (package.json), aber nicht importiert.
  Ein einzelner Avatar oder Foto-Preview ist OK; bei Bilder-Galerien (z. B.
  zukünftig im JourneyDetail) wird das Caching/Decoding zum Problem.
  **Empfehlung:** alle vier auf `expo-image` umstellen — Tausch ist trivial.

## Listen / FlatList / FlashList

| Liste | Komponente | keyExtractor | getItemLayout | Bewertung |
| --- | --- | --- | --- | --- |
| Journeys (Reisen-Tab) | `SectionList` | ✅ ja | ❌ nein | OK für 100 Reisen, zäh ab 1 000+. |
| EntitySearchModal | `FlatList` | ❌ kein expliziter keyExtractor (nutzt default index!) | ❌ nein | Bei großen Seed-Daten (8 000 Airports) wird die Suche langsam, aber Suche ist auf 20 Treffer limitiert (LIMIT 20 in `searchLocations`), also nicht akut. **Trotzdem keyExtractor setzen** — sonst flackern Items beim Filter-Change. |
| Onboarding modes | (kein) | — | — | — |

`@shopify/flash-list` ist installiert (package.json), aber **nirgendwo
verwendet**. Tim hat die Lib bewusst eingezogen, aber nicht angeschlossen.
Bei Ausbau (Trips, Photos-Galerie, Year-in-Review) sollte FlashList rein.

## Achievement-Engine: 1000 × 80 < 100ms

```
src/lib/achievements/__tests__/engine.test.ts:512
it('evaluates 1000 journeys × 80 achievements in < 100 ms', () => {
  …
  expect(elapsed).toBeLessThan(100);
});
```

Test ist **grün** (im 93/93-Lauf enthalten). Engine-Performance ist also
verifiziert.

Lokaler Re-Lauf bestätigt: Test bestanden, 93/93 in 346 ms gesamt
(Engine-Performance-Test allein < 100 ms).

ABER: `recalculateAchievements` (in `lib/achievements/sync.ts`) lädt
**bei jeder Journey-Mutation** alle Journeys + Locations + Operators + Vehicles
+ Unlocks per `db.select().from(...)`. Ohne LIMIT, ohne pagination. Bei 5 000
Journeys ist das eine 5 000-Zeilen-Tabelle in JS-Memory pro Insert/Update/Delete.
SQLite-Read ist schnell, aber das wird ab ~10 000 Journeys spürbar
(>50 ms pro Mutation). Mittel-Smell, aber nicht launch-blocking.

## DB-Indizes

Vorhanden:
- `locations`: iata, icao, ibnr, unlocode, type
- `operators`: code
- `vehicles`: code
- `journeys`: date, mode, fromLocationId, toLocationId, operatorId
- `achievement_unlocks`: UNIQUE auf achievementId

**Fehlend** (laut Spec wäre nice-to-have):
- `journeys.cabinClass` — für Premium-Filter und cabin_class-Achievement.
- `journeys.vehicleId` — wird in der Engine direkt geprüft, ohne SQL-Filter.
- Composite-Index `(fromLocationId, toLocationId)` — `evalRouteRepeat`
  würde von einer SQL-Aggregation profitieren statt JS-Map.

Aktuell: kein Performance-Problem, weil alle Aggregationen in JS laufen.
Sobald Daten >5 000 Journeys reichen, sollte über GROUP-BY-SQL nachgedacht werden.

## Sonstiges

- `useDbReady` rendert das ganze App-Tree-Switching neu (Stack.Screen wechselt
  zwischen Onboarding und Tabs basierend auf `onboardingCompleted`). Beim
  ersten Launch flackert das einmal — kosmetisch.
- Achievement-Recalc nach Insert wird **nicht batched**: bei mehreren
  Inserts hintereinander (z. B. CSV-Import) läuft die Engine N-mal. Phase 1
  hat keinen Bulk-Import, also egal — aber für später vormerken.

## Empfehlungen (priorisiert)

| # | Aktion | Aufwand |
| --- | --- | --- |
| 1 | `expo-image` statt `react-native`-Image für Avatar / Photo-Previews | 30 min |
| 2 | `MapView2D`: `greatCirclePath`-Berechnung in `useMemo` ziehen | 15 min |
| 3 | `EntitySearchModal`: explizit `keyExtractor={(item)=>item.id}` setzen | 5 min |
| 4 | `aggregateStatsMemo` anschließen oder löschen | 10 min |
| 5 | `recalculateAchievements`: optional Mode-Filter beim Read (nur die für die Mutation relevanten Achievements neu rechnen) | 1-2 h |
| 6 | Index auf `journeys.cabinClass` und `journeys.vehicleId` ergänzen | 5 min + 1 Migration |
| 7 | Bei späteren Listen (Trips/Photos) FlashList statt FlatList | je 30 min |
