# 21 — Performance

## Verdict

Für Phase-1-Normaldaten gut genug. Keine harte Device-Last-Verifikation im Audit, aber statische Risiken sind überschaubar und bekannt.

## Grün

- Achievement Pure-Engine Performance-Test 1000×80 <100ms grün (`src/lib/achievements/__tests__/engine.test.ts:511`).
- Seed-DB Fast Path ist schnell für frische Nutzer; Expo export bündelt Asset.
- Journey List nutzt `SectionList` mit Render-Windowing, kein kompletter ScrollView für alle Journeys.
- Map/Globe precomputen Great-Circle-Pfade per `useMemo` (`src/components/domain/MapView2D.tsx:73`, `src/components/domain/Globe3D.tsx:88`).
- AchievementToast queued Unlocks nacheinander (`src/components/ui/AchievementToast.tsx:29`).

## Risiken

- `listJourneysWithRefs()` lädt alle Journeys, alle Locations, alle Operators, alle Vehicles und joint im Speicher (`src/db/repositories/journey.repository.ts:54`). Bei 3.4k Locations okay, bei großen lokalen Katalogen unnötig schwer.
- `recalculateAchievements()` lädt ebenfalls alle fünf Tabellen nach jeder Mutation (`src/lib/achievements/sync.ts:23`).
- Map rendert für jede Journey eine Polyline mit 64 Punkten (`src/components/domain/MapView2D.tsx:85`). Bei mehreren hundert Reisen kann das auf älteren Geräten schwer werden.
- Globe3D ist ein SVG/2.5D-Placeholder; Kommentar selbst markiert Batching erst >50/>200 Journeys als TODO (`src/components/domain/Globe3D.tsx:110`, `:177`).
- AchievementToast kann bei vielen gleichzeitigen Unlocks mehrere 4-Sekunden-Toasts stapeln; kein Crash, aber lange UX-Queue.

## Build-Smoke

`expo export --platform ios` nach `/tmp/trazia-expo-export-v3` war grün. Kein real-device FPS/Memory-Profiling durchgeführt.

