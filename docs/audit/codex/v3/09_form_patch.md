# 09 — Form Logic & buildJourneyPatch

## Verdict

Der Final-Cleanup ist real: Forms verwenden die gemeinsamen Patch-Builder, und die Tests importieren die echten Funktionen. Ein größerer Submit-Bug liegt außerhalb des Patch-Builders: Parent- und Child-Writes sind nicht atomar.

## Gemeinsame Funktionen

- `computeDurationMinutes()` behandelt same-day, overnight, identische Zeiten und malformed input (`src/lib/journeys/duration.ts:10`).
- `buildFlightJourneyPatch()`, `buildTrainJourneyPatch()`, `buildOtherJourneyPatch()` sind die Single Source of Truth für Journey-Patches (`src/lib/journeys/buildJourneyPatch.ts:55`).
- Flight/Train/Other Forms importieren aus `src/lib/journeys/buildJourneyPatch.ts` und rufen die Builder im Submit auf (`src/components/domain/AddJourney/FlightForm.tsx:186`, `TrainForm.tsx:181`, `OtherForm.tsx:167`).

## Tests

Die Duration/Form-Patch-Tests testen keine Kopien, sondern die produktiven Builder:

- `src/components/domain/AddJourney/__tests__/flightForm-duration.test.ts`
- `src/components/domain/AddJourney/__tests__/trainForm-duration.test.ts`
- `src/components/domain/AddJourney/__tests__/otherForm-duration.test.ts`
- `src/lib/journeys/__tests__/duration.test.ts`

## Limits

- Duration ist nicht timezone-aware, obwohl Schema-Spalten existieren (`src/lib/journeys/duration.ts:5`). Bei internationalen Flügen mit lokalen Start-/Endzeiten kann die Dauer falsch sein.
- Keine React-Native-Integrationstests für Form UI -> DB -> AchievementToast.

