# HANDOFF TO CC - Final Remaining Items

Stand: 2026-05-04. Kein Vollaudit; nur die verbleibenden Punkte aus Codex Final Review.

## 1. Duration-Test auf echten Form-Pfad heben

Status: Runtime-Code ist gefixt, Test ist zu indirekt.

Problem:

- `FlightForm`, `TrainForm`, `OtherForm` rufen `computeDurationMinutes` und schreiben `durationMinutes`.
- `src/components/domain/AddJourney/__tests__/flightForm-duration.test.ts` dupliziert aber `buildFlightJourneyPatch` im Test statt den echten Form-Submit-Pfad oder eine Produktionsfunktion zu verwenden.

Fix-Anweisung:

- Entweder React-Native-Form in Vitest mit passenden Shims mounten und Submit auslösen, oder die Patch-Erzeugung in eine kleine Produktionsfunktion extrahieren, die von `FlightForm.tsx` wirklich verwendet wird und im Test importiert wird.
- Mindestens prüfen:
  - `14:00 -> 17:00 = 180`
  - `23:30 -> 04:00 = 270`
  - `00:00 -> 00:00 = 0`
  - create/update payload enthält `durationMinutes`, nicht nur der Helper-Rückgabewert.
- Optional gleich Train/Other mit abdecken, weil beide denselben Bug hatten.

## 2. Restore-Prevalidation vollständig machen

Status: Restore ist transaktional und datenverlustsicher; Prevalidation ist nur teilweise vollständig.

Problem:

- `validateSnapshot` prüft Version, Top-Level-Arrays, Duplikate und viele FKs.
- Es fehlen row-level Pflichtfelder und mindestens diese FK-Refs:
  - `journeys.parentJourneyId`
  - `achievementUnlocks.triggeringJourneyId`
- Aktuell fängt die Transaction solche Fälle ab, aber die Pre-Validation behauptet mehr Vollständigkeit als sie liefert.

Fix-Anweisung:

- `validateSnapshot` um required-field checks je Tabelle erweitern.
- Alle FK-Refs prüfen, inklusive Self-Refs und Achievement-Unlock-Trigger.
- Tests ergänzen:
  - fehlendes Pflichtfeld rejected vor Transaction, DB unverändert
  - kaputter `parentJourneyId` rejected vor Transaction
  - kaputter `achievementUnlock.triggeringJourneyId` rejected vor Transaction
  - valide Parent/Child-Journey im Snapshot bleibt erlaubt, wenn Parent in Snapshot existiert

## 3. Status-Doku bereinigen

Problem:

- `docs/audit/STATUS_LAUNCH.md` markiert Block 6 und 7 in der Tabelle noch als `offen`, obwohl Build-Smoke/Privacy-Hard-Stops darunter final dokumentiert sind.

Fix-Anweisung:

- Tabelle aktualisieren oder bewusst zwischen "technisch gefixt" und "Tim manuell vor Submit" trennen.
