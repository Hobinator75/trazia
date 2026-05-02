# B1 — Test-Coverage

Vorhandene Test-Dateien:

```
src/db/__tests__/location.repository.test.ts
src/db/__tests__/operator.repository.test.ts
src/db/__tests__/schema.smoke.test.ts
src/db/__tests__/seed.test.ts
src/db/__tests__/vehicle.repository.test.ts
src/lib/achievements/__tests__/engine.test.ts
src/lib/geo/__tests__/geo.test.ts
src/lib/stats/__tests__/stats.test.ts
src/stores/__tests__/achievementStore.test.ts
```

**93 Tests, alle grün.**

## Spec-Anforderungen abgedeckt

| Anforderung (aus Phasen-Prompt) | Status | Notiz |
| --- | --- | --- |
| `geo.test.ts` mit FRA-JFK | ✅ | `haversineDistance` ~6204 km, Bearing ~285-300° |
| `geo.test.ts` mit NRT-LAX | ✅ | `crossesPacific` true |
| `geo.test.ts` mit AKL-MAD | ✅ | `isAntipode` mit 500 km Toleranz |
| `geo.test.ts` mit SCL-FRA | ✅ | `crossesEquator` true |
| `geo.test.ts` mit LHR-LYR | ✅ | `crossesPolarCircle.north` true |
| `achievement-engine` Tests pro rule.type | ✅ | Alle 15 rule-types haben Tests, plus evaluateAll, hidden, performance |
| `stats` Tests mit Sample-Daten | ✅ | 6 Test-Reisen (3 Flüge, 1 Zug, 1 Auto, 1 Schiff), prüfen Modes/Distanz/Operatoren/Counts |
| Repository-Tests | ✅ | location, operator, vehicle, plus seed + schema-smoke |
| Performance: 1000 × 80 < 100ms | ✅ | engine.test.ts `describe('performance')` |

## Was fehlt

| Bereich | Begründung |
| --- | --- |
| **Journey-Repository** | `createJourney`/`updateJourney`/`deleteJourney`/`duplicateJourney` haben keine direkten Tests. Workflows wie „Insert triggert Achievement-Recalc" sind ungeprüft, obwohl genau das die Kernschleife der App ist. |
| **achievement/sync.ts** (`recalculateAchievements`) | Kein Test. Der größte Code-Pfad nach jedem Insert läuft ungetestet. |
| **journeySchemas.ts** (Zod) | Keine Tests für Edge-Cases (Datum-Format, leere Strings, Companions-Array, …). |
| **lib/journeys/sections.ts** (`applyFilters`, `buildFacets`, `groupByYearMonth`) | Filter- und Gruppen-Logik ohne Tests. Ein Off-by-one in `groupByYearMonth` verschiebt sich UI-weit. |
| **lib/export/{csv,json,pdf,snapshot}** | Keine Tests. Snapshot-Format-Versionierung wird real bei Restore relevant. Mind. ein Roundtrip-Test (export→restore) wäre billig und sehr wertvoll. |
| **lib/backup/index.ts** (restoreFromBackup) | Kein Test. Restore wipest die DB — ein einziger versehentlicher Bug zerstört dem User die Daten. |
| **lib/data/wipeAll.ts** | Kein Test. |
| **iap/mock.ts** + premiumStore | Keine Tests. |
| **lib/ads/interstitialController.ts** + Trigger-Logik | Keine Tests. |
| **OnboardingStore** | Keine Tests. |
| **Reanimated/Pressable-Komponenten** | Reine Render-Tests fehlen, was OK ist; aber „smoke render"-Test pro Screen wäre nützlich. |

## Test-Qualität allgemein

- **Engine-Tests sind die Krönung der Codebase.** Klar lesbar, exemplarisch
  pro Rule, Performance-Test verankert die Spec-Anforderung.
- Geo-Tests sind robust mit realen Koordinaten.
- Stats-Tests prüfen sowohl die Zusammenfassung als auch die Memoization.
- `db/__tests__/test-db.ts` ist als Helper sinnvoll (better-sqlite3 in-memory).

## Empfehlungen

| # | Test-Lücke | Wert / Aufwand |
| --- | --- | --- |
| 1 | `journey.repository`: createJourney triggert sync, sync schreibt Unlock | hoch / 1 h |
| 2 | `backup`: write→restore Roundtrip mit assertEqual auf alle Tabellen | hoch / 1 h |
| 3 | `lib/journeys/sections`: applyFilters mit jedem Facet-Typ | mittel / 1 h |
| 4 | `journeySchemas`: Zod-Edge-Cases | niedrig / 30 min |
| 5 | Onboarding-Store-Test (hydrate/finish/reset Flow) | mittel / 30 min |
