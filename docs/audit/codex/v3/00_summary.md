# Codex Vollscan v3 — Summary

Stand: 2026-05-04. Audit-Modus: read-only; neue Artefakte nur unter `docs/audit/codex/v3/`.

## Sektion A: Top-Befunde gesamt

### Exzellent

1. **Tooling-Baseline ist stark.** `npm run typecheck`, `npm run lint`, `npm run test` und `npx expo-doctor` laufen grün; Vitest meldet `26 passed`, `220 passed`.
2. **Achievement-Engine ist sauber mode-isoliert.** `scopeByAppliesTo()` filtert vor der Regelwertung (`src/lib/achievements/engine.ts:70`), und die Tests decken die alten Cross-Mode-Bugs gezielt ab (`src/lib/achievements/__tests__/engine.test.ts:557`).
3. **Backup/Restore ist deutlich robuster als in alten Befunden.** Pre-Validation prüft Pflichtfelder, FKs, Self-Refs und `triggeringJourneyId` vor der destruktiven Phase (`src/lib/backup/restore.ts:77`), Restore läuft in einer manuellen SQLite-Transaktion mit Rollback (`src/lib/backup/restore.ts:221`).
4. **Seed-DB-Fresh-Install ist plausibel schnell.** Pre-built DB ist gebündelt (`src/db/seed/loadFromSeedDbAsset.ts:10`), temporärer iOS-Export ist grün, Seed-Asset 1.06 MB; alte Perf-Evidence: 3.6 ms Seed-DB vs. 47.5 ms JSON lokal (`docs/audit/perf-evidence.txt:4`).
5. **Form-Patch-Cleanup ist echt angeschlossen.** Flight/Train/Other importieren die echten `build*JourneyPatch`-Funktionen (`src/lib/journeys/buildJourneyPatch.ts:55`), nicht Testkopien.

### Solide

- Datenmodell deckt Kernobjekte, Child-Collections, Trips und Achievement-Unlocks sinnvoll ab (`src/db/schema.ts:87`, `src/db/schema.ts:193`).
- FK-Verhalten passt grundsätzlich: Locations werden bei Journey-Referenzen geschützt, Operator/Vehicle werden bei Katalogwechsel auf `null` gesetzt (`src/db/schema.ts:92`, `src/db/schema.ts:103`).
- Migrations-Pfad startet App auch bei Achievement-ID-Duplizierung weiter; Konflikte werden an Sentry gemeldet (`src/lib/achievements/migration.ts:127`, `src/lib/achievements/reportMigration.ts:33`).
- Stats-Memoization ist angeschlossen (`src/hooks/useStatsData.ts:76`), auch wenn sie nur bei stabilen Referenzen hilft.
- Geo-Distanz und Great-Circle-Sampling sind für Flug-Phase-1 brauchbar; NRT-LAX/IDL ist für Distanz korrekt.
- Expo-Export-Smoke nach `/tmp/trazia-expo-export-v3` ist grün; iOS JS Bundle 10.7 MB, Export gesamt 15 MB.
- Empty-States sind in den wichtigen Listen/Charts vorhanden.

### Risiko / Bug-Liste

| Severity | Typ | Befund |
| --- | --- | --- |
| P1 | Launch-Gap | Phase-1-Vorgabe sagt "nur Flug sichtbar"; AddJourney zeigt aber `Sonstiges` aktiv sowie Zug/Auto/Schiff/Bus als gesperrte Tiles (`src/components/domain/modePickerConfig.ts:19`, `src/components/domain/ModePicker.tsx:24`). |
| P1 | Privacy-Bug | Settings-Store ist nicht persistiert; `crashReportsEnabled` startet nach App-Neustart wieder auf `true` (`src/stores/settings.store.ts:32`). Sentry wird beim Boot konfiguriert (`app/_layout.tsx:33`). |
| P1 | Privacy-Gap | In-App-Datenschutzerklärung erwähnt Sentry/PostHog nicht, obwohl die SDKs integriert sind (`src/lib/legal/content.ts:7`, `src/lib/observability/sentry.ts:20`, `src/lib/observability/analytics.ts:64`). |
| P1 | Release-Gap | Production-Config hat AdMob-Test-App-IDs/Test-Units und leere iOS Submit IDs (`app.json:79`, `src/lib/ads/units.ts:17`, `eas.json:64`); `npm run format:check` fällt auf 28 Dateien. |
| P2 | Datenintegrität | Form Submit schreibt Journey und Children nicht atomar; bei Fehler nach `createJourney` bleibt eine Teilreise, bei Edit können Tags/Fotos/Companions gelöscht bleiben (`src/components/domain/AddJourney/FlightForm.tsx:188`). |
| P2 | Upgrade-Risiko | Seed-DB-Fast-Path löscht System-Locations vor Insert; bei bestehenden Journeys mit FK auf System-Location scheitert das mit FK-Constraint und fällt auf JSON zurück (`src/db/seed/loadFromSeedDb.ts:73`, `src/hooks/useDbSeed.ts:42`). |
| P2 | UX-Bug | Light/System-Theme ist in der Praxis inkonsistent: viele Screens hardcoden Dark-Klassen, Navigation nutzt System-Scheme statt Settings (`app/_layout.tsx:27`, `src/stores/settings.store.ts:32`). |
| P3 | Geo-Bug | `bezierPath()` nimmt die kurze Kontrollpunkt-Richtung, interpoliert aber zum rohen Ziel-Längengrad; IDL-Routen laufen visuell über Eurasien/Afrika (`src/lib/geo/index.ts:122`). Aktuell nicht im Flugpfad genutzt. |
| P3 | A11y-Gap | Viele `Pressable`s haben weder Role noch Label; z.B. ModePicker und SelectButton (`src/components/domain/ModePicker.tsx:28`, `src/components/ui/FormField.tsx:52`). |

## Sektion B: Launch-Bereitschaft Phase 1

**BEREIT: NEIN für Store-Submit / Production-Build.**

Nicht wegen der Engine. Die Kernlogik ist in gutem Zustand. Nein wegen vier konkreten Pre-Submit-Punkten:

1. Phase-1-Produktoberfläche final entscheiden und umsetzen: wirklich nur Flug sichtbar, oder Flight+Other+Locked-Teaser bewusst akzeptieren.
2. Settings persistieren, mindestens Crash-Report-Opt-out dauerhaft speichern.
3. In-App-Datenschutzerklärung mit tatsächlichen SDKs abgleichen: Sentry, PostHog, RevenueCat, AdMob/UMP, ATT-Verhalten.
4. Production-Konfig finalisieren: echte AdMob IDs/Units oder Ads deaktivieren, EAS iOS Submit IDs setzen, Prettier-Format-Fail beheben.

Wenn diese vier Punkte erledigt sind, spricht aus diesem Audit nichts gegen einen Phase-1-TestFlight-/Internal-Track-Build.

## Sektion C: Größtes Restrisiko nach Launch

Das größte Restrisiko ist nicht Datenverlust beim frischen User, sondern ein Compliance-/Vertrauensbruch: Privacy-Opt-out und Legal Copy müssen exakt zu den tatsächlich aktivierten SDKs passen.

## Sektion D: Empfehlung für Tims nächste Schritte

1. **Jetzt:** die vier P1-Items aus `HANDOFF_TO_CC_V3.md` fixen und danach `typecheck`, `lint`, `test`, `format:check`, `expo-doctor`, temporären `expo export` erneut laufen lassen.
2. **Danach:** Test-Drehbuch nur auf Phase-1-User-Flows fahren: Onboarding, Add Flight, Edit Flight, Delete Flight, Backup/Restore, Paywall/Ads/Consent, Achievements.
3. **Production-Build:** erst nach echten Store-/Ad-/Privacy-Daten. Vorher höchstens Preview/Internal.
4. **Cleanup bewusst begrenzen:** Submit-Transaktion und Theme/A11y sind sinnvoll, aber nach P1 trennbar; kein weiterer Vollrefactor vor erstem Phase-1-Build.

## NACH V3-FIX-SESSION

Stand: 2026-05-04 nach Cleanup-Pass. Details: `docs/audit/STATUS_V3.md`.

### Was sich geändert hat gegenüber Codex' Bewertung

Alle vier P1-Punkte aus Sektion B sind erledigt:

1. **Phase-1-Mode-Sichtbarkeit** ist auf Flight + Other reduziert. Train/
   Auto/Schiff/Bus tauchen weder in `ModePicker` noch in
   `app/onboarding/modes.tsx` auf. `PHASE_1_VISIBLE_MODES` und
   `ALL_MODES` sind sauber getrennt — bestehende Train-Reisen sind
   weiterhin via Edit-Screen editierbar.
2. **Settings-Persistenz** ist umgesetzt via `zustand persist` mit
   AsyncStorage-Backend; `crashReportsEnabled`, `analyticsEnabled`,
   `theme`, `distanceUnit`, `soundEnabled` überleben App-Neustart.
   Sentry beforeSend liest weiterhin den live Store-Wert.
3. **In-App-Datenschutzerklärung** in `src/lib/legal/content.ts` nennt
   Sentry und PostHog explizit mit Zweck, Datenkategorien (EU-Hosting),
   Default-State und Opt-out-Pfad. ATT/IDFA-Stance ist klar formuliert.
4. **Production-Konfig**: AdMob-Modul wirft hard-fail bei
   `EXPO_PUBLIC_ENV=production` ohne echte Unit-IDs, eas.json hat
   sprechende `REPLACE_WITH_*`-Sentinels für Apple-IDs,
   `npm run format:check` ist nach `prettier --write` grün.

Zusätzlich erledigt (P2 wichtig):

5. **Submit-Atomarität**: Neue `saveJourneyWithExtras`-Repository-
   Funktion bündelt Journey-Mutation und Child-Collections in einer
   SQLite-Transaktion mit ROLLBACK bei Fehlern.
   FlightForm/TrainForm/OtherForm sind angeschlossen.
6. **Theme-Ehrlichkeit**: dark-only für Phase 1. Profil-UI zeigt
   Erscheinungsbild als statische Info-Card mit Hinweis auf späteres
   Light-Update.

### Verbleibendes Restrisiko nach Fixes

- **P3-Items** (bezierPath IDL, A11y-Labels, Map-Last-Messung) bleiben
  offen aber nicht launch-blocking.
- **Manuelle Pre-Submit-Tasks** (AdMob-IDs, Apple-Team-ID,
  Sentry-DSN/Token, Privacy-Policy-Hosting) sind in
  RELEASE_CHECKLIST und STATUS_V3 dokumentiert. Der Code-Pfad failed
  jetzt laut, wenn diese fehlen.
- **Compliance-/Vertrauensbruch-Risiko** aus Sektion C ist deutlich
  reduziert: Privacy-Opt-out persistiert, In-App-Copy spiegelt die
  tatsächlich aktivierten SDKs wider. Verbleibender Kontrollpunkt:
  Privacy-Manifest-Validierung nach erstem nativem Build (Xcode
  Privacy Report Tool).

### Toolchain-Status nach Fix-Pass

`typecheck`, `lint`, `format:check` jeweils 0 errors. 247 Tests grün
über 31 Files. `expo-doctor` 17/17. iOS-Export-Smoke 15 MB.

