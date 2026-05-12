# 06 — Achievement Engine

## Verdict

Launch-tauglich. Die alte Mode-Isolation-Klasse ist sauber gefixt. Restrisiko ist eher Performance bei sehr vielen lokalen Journeys durch DB-Fetch vor der Engine, nicht die Engine selbst.

## Rule-Coverage

Engine implementiert alle katalogisierten Rule-Typen: count, distance_total, single_journey_distance, single_journey_duration, geo_condition, date_match, vehicle_category, operator_set, route_repeat, operator_loyalty, different_count, time_window, cabin_class, season_complete, month_complete (`src/lib/achievements/engine.ts:90`).

Catalog-Test prüft:

- eindeutige IDs,
- nur implementierte Rule-Typen,
- jeder Rule-Type kommt im Katalog vor,
- mindestens 32 Flight und 18 Train,
- kein Legacy `atlantic_crosser`,
- jedes Achievement hat `appliesTo` (`src/lib/achievements/__tests__/catalog.test.ts:26`).

## Mode-Isolation

`scopeByAppliesTo()` filtert `ctx.allJourneys` vor der Regelwertung (`src/lib/achievements/engine.ts:70`). Tests prüfen Flight/Train First-Class, DB-Code-Kollisionen und Transatlantic-via-Ship (`src/lib/achievements/__tests__/engine.test.ts:601`).

## Performance

Der Test `1000 journeys × 80 achievements < 100ms` ist vorhanden und grün (`src/lib/achievements/__tests__/engine.test.ts:511`). Realistisch für die Pure-Engine.

Nicht enthalten: DB-Fetch-Kosten. `recalculateAchievements()` lädt bei jeder Mutation alle Journeys, Unlocks, Locations, Operators und Vehicles (`src/lib/achievements/sync.ts:23`). Für Phase 1 okay; bei mehreren tausend Journeys später inkrementell denken.

## Edge Cases

- `evaluateAll()` skippt bereits unlockte IDs (`src/lib/achievements/engine.ts:52`).
- Neue Unlocks werden gesammelt inserted, aber ohne `onConflictDoNothing` (`src/lib/achievements/sync.ts:53`). In normalem Single-JS-Submit okay; bei parallelen Recalc-Läufen theoretischer Unique-Konflikt.
- Hidden Achievements werden engine-seitig evaluiert; UI muss sie verstecken.

