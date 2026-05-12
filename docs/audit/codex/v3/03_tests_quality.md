# 03 — Tests-Qualität

## Verifikation

`npm run test` meldet: `Test Files 26 passed (26)`, `Tests 220 passed (220)`.

## Klassifizierung

### Hochwertige Geschäftslogik-Tests

- Achievements Engine/Catalog/Migration/Reporting: deckt alle Rule-Typen, Performance, appliesTo-Isolation, Legacy-ID-Migration und Sentry-Reporting ab (`src/lib/achievements/__tests__/engine.test.ts`, `catalog.test.ts`, `migration.test.ts`, `reportMigration.test.ts`).
- DB Schema/Repositories/Seed/Seed-DB: prüft FK-Verhalten, CRUD, Seed-Idempotenz, Seed-DB-Asset und Migration-Parität (`src/db/__tests__/*`).
- Backup/Restore/Export: prüft Snapshot-Roundtrip, Pre-Validation, FK/Self-Ref/Triggering-Journey und Rollback bei Mid-Restore-Failure (`src/lib/backup/__tests__/*`, `src/lib/export/__tests__/snapshot.test.ts`).
- Geo/Stats/Journey Sections: gute Pure-Function-Abdeckung für Kernaggregationen und Geo-Berechnungen (`src/lib/geo/__tests__/geo.test.ts`, `src/lib/stats/__tests__/stats.test.ts`, `src/lib/journeys/__tests__/sections.test.ts`).
- Launch-Blocker-Repros: gute Regressionstests für alte konkrete Bugs (`src/__tests__/launch-blockers.test.ts`).

### Mittelwertige Tests

- Form-Duration-Tests importieren echte `build*JourneyPatch`-Funktionen und sind damit wertvoll, aber sie testen nicht den kompletten React-Native-Submit mit DB-Children (`src/components/domain/AddJourney/__tests__/*duration.test.ts`).
- Feature-Flag/Onboarding-Tests prüfen den aktuellen Produktentscheid. Problem: dieser Produktentscheid widerspricht der neuen Audit-Vorgabe "nur Flug sichtbar" (`src/config/__tests__/featureFlags.test.ts:19`).
- Store-Test für AchievementStore prüft Listener/Events, aber nicht Toast-Rendering oder Queue-UX (`src/stores/__tests__/achievementStore.test.ts`).

### Kosmetisch / Smoke

- `schema.smoke.test.ts` ist teilweise Smoke, aber mit FK-Fail wertvoll.
- Catalog-Counts wie "mindestens 32 Flight" sind gute Spec-Smokes, aber keine inhaltliche Qualität der Achievement-Texte.
- `launch-blockers.test.ts` enthält gute Regressionen, aber ist eine Sammeldatei; langfristig besser bei den jeweiligen Modulen.

### Stark gemockt?

Keine übermockten Tests gefunden, die komplett am echten Code vorbeilaufen. Auffällig: Sentry-/Reporting-Tests injizieren Reporter bewusst und korrekt. Native Module werden meist durch Lazy Imports umgangen, nicht totgemockt.

## Coverage-Lücken

- Kein End-to-End-/Integrationstest für echten Form-Submit inklusive Journey + Tags + Photos + Companions in einer Transaktion.
- Kein Test für Settings-Persistenz, weil Settings aktuell nicht persistiert werden.
- Kein Test für In-App-Privacy-Copy gegen tatsächliche SDK-Liste.
- Kein Test, der "Phase 1 = nur Flug sichtbar" erzwingt; aktuelle Tests erlauben `Other` und locked Train.
- Kein Test für `bezierPath()` über die Date Line.
- Kein Device-/rendernaher Test für AchievementToast-Queue, Map/Globe-Last, Font-Scaling oder Accessibility.

