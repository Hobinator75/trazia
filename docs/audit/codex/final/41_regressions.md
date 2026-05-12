# Codex Final Review - Regression Stichproben

Stand: 2026-05-04. Scope: vier gezielte Regressions-Checks nach den Launch-Fixes.

| Stichprobe | Befund | Verdict |
|---|---|---|
| B1 Achievement-Engine Performance | Performance-Test ist weiterhin vorhanden: `1000 journeys x 80 achievements < 100 ms` (`src/lib/achievements/__tests__/engine.test.ts:511`). Die appliesTo-Isolation filtert pro Achievement einmal vor der Rule (`src/lib/achievements/engine.ts:75`) und führt keine offensichtliche neue N^2-Struktur über den bestehenden Evaluationspfad hinaus ein. Ich habe die Suite read-only nicht erneut ausgeführt; CC meldet 193/193 grün. | OK |
| B2 Seed-Loader Pre-built Path | `src/db/seed/loadFromSeedDb.ts` wurde durch die sieben `fix(launch):` Commits nicht angefasst. Der bekannte Existing-user-FK-Fall bleibt damit unverändert: Fast-Path löscht System-Seeds (`loadFromSeedDb.ts:73`) und kann bei Journey-FKs auf alte System-Locations rollbacken; JSON-Fallback bleibt der Airbag. Das war im alten Audit als Post-/Follow-up-Risiko dokumentiert, nicht durch diese Fixes verschlimmert. | OK, Risiko unverändert |
| B3 Repository-Tests durationMinutes | `journey.repository.test.ts` setzt `durationMinutes` im Create-Pfad nicht mehr manuell und dokumentiert genau den alten Maskierungsfehler (`src/db/__tests__/journey.repository.test.ts:87`). Die verbleibenden `durationMinutes:` Treffer liegen in Engine-/Restore-Testdaten oder im gespiegelten FlightForm-Patch-Test, nicht im Repository-Mock. | OK |
| B4 Catalog-Test Mode-Isolation | Catalog-Test erzwingt `appliesTo` fuer alle Achievements (`src/lib/achievements/__tests__/catalog.test.ts:97`) und mode-sensitive Rule-Typen (`catalog.test.ts:105`). Der Engine-Test wuerde brechen, wenn `appliesTo` wieder ignoriert wird: first_class, DB-Code und transatlantic-Bugcases sind explizit abgedeckt (`engine.test.ts:601`, `engine.test.ts:617`, `engine.test.ts:661`). Catalog-Test allein testet nicht die Engine, aber zusammen ist die Regression gut abgedeckt. | OK |

## Regressionsfazit

Keine neue Runtime-Regression in den Stichproben gefunden. Zwei Restrisiken bleiben sichtbar: der Seed-Fast-Path Existing-user-FK-Fall ist unverändert, und der Duration-Regressionstest ist noch nicht der echte Form-Submit-Pfad.
