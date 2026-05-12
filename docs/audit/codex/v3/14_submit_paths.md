# 14 — Form-Submit-Pfade

## Verdict

Happy Path funktioniert, aber die Mutation ist nicht atomar. Das ist der wichtigste echte Datenintegritätsbug im Code.

## Add Flight Flow

AddJourney -> FlightForm -> `buildFlightJourneyPatch()` -> `createJourney()` -> `recalculateAchievements()` -> child inserts -> snackbar/router back.

Evidence:

- Patch Build: `src/components/domain/AddJourney/FlightForm.tsx:186`
- Create/Update: `src/components/domain/AddJourney/FlightForm.tsx:188`
- Child Inserts: `src/components/domain/AddJourney/FlightForm.tsx:202`
- Repository Insert + Achievement Recalc: `src/db/repositories/journey.repository.ts:102`
- Achievement insert + Toast notification: `src/lib/achievements/sync.ts:53`
- Toast Queue: `src/components/ui/AchievementToast.tsx:37`

## Same für Edit

Edit lädt Journey+Extras (`app/(tabs)/journeys/edit/[id].tsx:35`), rendert mode-spezifische Form, Form macht `updateJourney()`, löscht Child Collections und fügt neue ein.

## Bug

Flight/Train/Other schreiben Journey und Children außerhalb einer gemeinsamen Transaktion:

- Flight: `src/components/domain/AddJourney/FlightForm.tsx:188`
- Train: `src/components/domain/AddJourney/TrainForm.tsx:183`
- Other: `src/components/domain/AddJourney/OtherForm.tsx:173`

Fehlerszenarien:

- Create: `createJourney()` erfolgreich, Achievement-Recalc erfolgreich, danach Tag/Photo/Companion-Insert scheitert. Ergebnis: Reise ist gespeichert, UI zeigt Fehler.
- Edit: `updateJourney()` erfolgreich, alte Children gelöscht, neue Child-Inserts scheitern. Ergebnis: Reise bleibt, alte Tags/Fotos/Companions sind weg.
- `recalculateAchievements()` kann nach Journey-Insert scheitern; dann ist Journey gespeichert, aber Form meldet Fehler.

## Toast / Animation

AchievementToast queued Unlocks (`src/components/ui/AchievementToast.tsx:29`), zeigt sie nacheinander und hängt als globaler Overlay in RootLayout (`app/_layout.tsx:89`). Submit-Animation/Konflikt ist eher UX als Datenrisiko. Bei vielen Unlocks dauert die Queue lang, aber sie blockiert Submit nicht.

