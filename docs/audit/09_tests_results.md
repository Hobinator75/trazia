# B2 — Test-Ergebnisse

```
$ npm test
> trazia-app@0.1.0 test
> vitest run

 RUN  v4.1.5 /Users/timhobrlant/Desktop/Trazia/app

 Test Files  9 passed (9)
      Tests  93 passed (93)
   Start at  07:19:28
   Duration  346ms (transform 302ms, setup 0ms, import 1.30s, tests 116ms, environment 0ms)
EXIT=0
```

**Alle 93 Tests bestanden.**

## Pro Datei

| Datei | Tests | Bemerkung |
| --- | --- | --- |
| `src/db/__tests__/location.repository.test.ts` | mehrere | Search-Ranking, IATA/ICAO-Lookup |
| `src/db/__tests__/operator.repository.test.ts` | mehrere | nach Modes filtern |
| `src/db/__tests__/schema.smoke.test.ts` | mehrere | Tabelle-Existenz, Insert/Read |
| `src/db/__tests__/seed.test.ts` | mehrere | fresh-install / self-heal / up-to-date |
| `src/db/__tests__/vehicle.repository.test.ts` | mehrere | category-Filter |
| `src/lib/achievements/__tests__/engine.test.ts` | ~22 | inkl. performance < 100 ms |
| `src/lib/geo/__tests__/geo.test.ts` | ~20 | inkl. FRA-JFK, NRT-LAX, AKL-MAD, SCL-FRA, LHR-LYR |
| `src/lib/stats/__tests__/stats.test.ts` | ~10 | aggregate, byYear/Mode/Month, topRoutes/Operators, memoize |
| `src/stores/__tests__/achievementStore.test.ts` | mehrere | Listener-Subscription, appendUnlocks, queue |

Test-Setup: `vitest@4.1.5` mit `better-sqlite3@12.9.0` für in-memory DB-Tests
(verifiziert in `src/db/__tests__/test-db.ts`).

## Keine roten Tests, keine Skips

Auch keine `.skip()` oder `.todo()`-Marker im Test-Tree.

## Bewertung

Test-Suite läuft sauber durch und in unter 1 Sekunde. **Kein Fix nötig.**
Die Lücken aus 08_tests_coverage.md sind „untested code", nicht „failing
tests" — das ist ein Risiko, kein Showstopper.
