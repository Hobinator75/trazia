# HANDOFF_TO_CC_V3

## Ziel

Trazia von "technisch stark, aber nicht submit-ready" zu "Phase-1-Production-Build möglich" bringen. Bitte keine großen Refactors; diese Liste ist absichtlich eng.

## P1 — vor Store Submit

### 1. Phase-1-Mode-Sichtbarkeit entscheiden und fixen

Aktueller Widerspruch: Vorgabe sagt "nur Flug sichtbar"; Code zeigt `Other` aktiv und locked Train/Car/Ship/Bus.

Fix-Option A, wenn wirklich nur Flug:

- `src/components/domain/modePickerConfig.ts`: `MODES` für Phase 1 nur Flight exportieren oder hidden/visible getrennt modellieren.
- `app/onboarding/modes.tsx`: locked Auto/Schiff/Bus entfernen.
- `src/config/__tests__/featureFlags.test.ts`: Test auf "nur Flight aktiv/sichtbar" ändern.
- Manuell prüfen: Onboarding, AddJourney, Stats Copy.

Fix-Option B, wenn Flight+Other+Locked Teaser gewollt:

- Produktdefinition in Release-Doku explizit anpassen.
- Summary/Store-Copy nicht "nur Flug" nennen.

### 2. Settings persistieren, mindestens Privacy Toggles

Problem: `src/stores/settings.store.ts` ist reiner Zustand ohne Persistenz; Crash-Report-Opt-out resetet auf `true`.

Fix:

- Zustand `persist` mit AsyncStorage einbauen.
- Mindestens `crashReportsEnabled`, `analyticsEnabled`, `theme`, `distanceUnit`, `soundEnabled` persistieren.
- Migration/Version für Store einplanen.
- Tests: Defaultwerte, Toggle bleibt nach Store-Rehydrate erhalten, Sentry `beforeSend` droppt nach Opt-out auch nach "restart" Simulation.

### 3. In-App Privacy Copy aktualisieren

Problem: `src/lib/legal/content.ts` erwähnt Sentry/PostHog nicht.

Fix:

- In-App Text mit `docs/privacy-policy-de.md` abgleichen.
- Sentry, PostHog, AdMob/UMP, RevenueCat, lokale Daten, Export/Löschung nennen.
- Navigationspfad für Daten löschen korrekt beschreiben.
- Falls ATT nicht genutzt wird: klar formulieren, dass ohne ATT keine IDFA/personalisiertes Tracking genutzt wird.

### 4. Production-Konfig finalisieren

Fix:

- `app.json`: echte AdMob App IDs oder Ads für ersten Build bewusst deaktivieren.
- EAS Secrets für Ad Units setzen oder hart failen, wenn Production ohne IDs gebaut wird.
- `eas.json`: `ascAppId` und `appleTeamId` setzen.
- Sentry DSN/Auth Token/Org/Project in EAS verifizieren.
- `npm run format:check` grün machen.

## P2 — nach P1, aber vor breitem Launch sinnvoll

### 5. Submit-Path atomar machen

Problem: Forms schreiben Journey und Child-Collections außerhalb einer gemeinsamen Transaktion.

Fix:

- Repository-Funktion einführen: `saveJourneyWithExtras(db, patch, extras, editing?)`.
- Journey create/update, child delete/insert und Achievement-Recalc in eine konsistente Mutation bringen.
- Für Edit: alte Children erst ersetzen, wenn neue Inserts erfolgreich sind.
- Tests: Create failure after journey insert rollt zurück; Edit failure after child delete rollt zurück.

### 6. Seed-Fast-Path für Bestandsuser FK-sicher machen

Optionen:

- System-Locations nicht löschen, sondern per PK upsert/insert-or-replace FK-sicher aktualisieren.
- Oder vor Fast-Path prüfen, ob System-Seed-Locations referenziert sind; bei ja direkt JSON/upsert-Pfad.
- Up-to-date-Check um Counts/Checksum/Sentinel erweitern.

### 7. Theme-Feature ehrlich machen

Optionen:

- Für v1 offiziell dark-only: Light/System Toggle aus UI entfernen.
- Oder Komponenten auf echte light/dark Klassen/Tokens umbauen und Navigation an Settings statt nur System-Scheme binden.

## P3 — Polish

- `bezierPath()` über Date Line korrigieren und Test NRT-LAX/IDL hinzufügen.
- Accessibility Labels/Roles für ModePicker, SelectButton, Icon Buttons, Toast, Modals ergänzen.
- Map/Globe Last mit 500+ Journeys auf Device messen.

