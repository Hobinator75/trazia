# 08 — Stats Library

## Verdict

Stats sind logisch solide. Der alte Befund "aggregateStatsMemo nicht angeschlossen" ist behoben. Zwei Einschränkungen bleiben: Memoization hilft nur bei stabilen Referenzen, und vorhandene Train/Other-Daten werden weiterhin in Stats sichtbar.

## Befunde

- `aggregateStats()` zählt Modi, Distanz, Dauer, Länder, Operatoren, Locations, Vehicles, Longest/Shortest, häufigste Route/Operator (`src/lib/stats/index.ts:47`).
- Empty-Input liefert Null-/Nullshape statt Crash (`src/lib/stats/index.ts:146`).
- `statsByYear`, `statsByMode`, `statsByMonth`, `topRoutes`, `topOperators` sind mit Tests abgedeckt (`src/lib/stats/__tests__/stats.test.ts`).
- `aggregateStatsMemo` existiert und ist angeschlossen (`src/lib/stats/index.ts:280`, `src/hooks/useStatsData.ts:76`).

## Limits

- `reload()` erzeugt neue Arrays und Maps (`src/hooks/useStatsData.ts:31`), dadurch ist Referenz-Memoization bei Fokus-Reloads begrenzt.
- Stats laden alle Locations/Operators zusätzlich (`src/hooks/useStatsData.ts:34`). Für 3.4k Locations okay, aber kein langfristiges Skalierungsmodell.
- `ChartsSection` zeigt bei nur Flug sauber `100% Flugreisen` statt Ein-Slice-Donut (`src/components/domain/Stats/ChartsSection.tsx:111`).
- Wenn Tim alte Train-Daten in der DB hat, tauchen sie in Stats/Mode-Pie auf (`src/components/domain/Stats/ChartsSection.tsx:46`). Das ist nicht crashig, aber nicht "Train versteckt".

