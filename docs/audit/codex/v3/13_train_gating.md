# 13 — Train Gating

## Verdict

Train-Neuanlage ist gegated, aber Train ist nicht konsequent "versteckt", und Phase 1 ist nicht "nur Flug sichtbar". Unter der aktuellen Audit-Vorgabe ist das ein P1-Launch-Gap.

## Feature Flags

`FEATURE_FLAGS.PHASE_2_TRAIN_VISIBLE` ist `false`; Car/Ship ebenfalls false (`src/config/featureFlags.ts:10`).

## AddJourney

- `MODES` enthält Flight enabled, Train disabled, Auto/Schiff/Bus disabled, **Other enabled** (`src/components/domain/modePickerConfig.ts:19`).
- ModePicker rendert alle Modi als Tiles, disabled mit Lock (`src/components/domain/ModePicker.tsx:24`).
- AddJourney fällt defensiv von Train auf FlightForm zurück, wenn Flag aus ist (`app/(tabs)/journeys/add.tsx:24`).

## Onboarding

- Train wird bei Flag false komplett versteckt (`app/onboarding/modes.tsx:19`).
- Auto/Schiff/Bus bleiben als locked Tiles sichtbar (`app/onboarding/modes.tsx:26`).

## Existing Train Data

Bestehende Train-Reisen sind weiterhin sichtbar/editierbar: Edit-Screen rendert `TrainForm` für `mode === 'train'` unabhängig vom Flag (`app/(tabs)/journeys/edit/[id].tsx:76`). Delete geht über die normale Journey-Liste. Das ist gut gegen Crashs mit Tims Testdaten, aber nicht "Train komplett versteckt".

## Stats-Mode-Pie

Nur Flug-Daten: sauber `100% Flugreisen` (`src/components/domain/Stats/ChartsSection.tsx:111`). Mit alten Train-Daten: Zug taucht in Pie/Stats auf.

## Produktentscheid nötig

Aktuelle Tests kodifizieren Flight+Other als Phase-1 aktiv (`src/config/__tests__/featureFlags.test.ts:19`). Das widerspricht der vom User formulierten Launch-Definition. Entweder Tests/Code an "nur Flug" anpassen oder Produktdefinition dokumentiert ändern.

