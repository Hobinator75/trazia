# Codex Cross-Audit v2 - Achievement-Engine-Korrektheit

## Top-Befunde

| Befund | Code | Severity |
|---|---|---:|
| Duration-Achievements unlocken im realen Form-Pfad nicht | Engine liest `j.durationMinutes` (`engine.ts:134-141`), aber Flight/Train/Other Forms setzen es nicht (`FlightForm.tsx:185-202`, `TrainForm.tsx:180-197`, `OtherForm.tsx:173-185`). | `[LAUNCH]` |
| Mode-Isolation fehlt fuer viele Rule-Types | `evalGeoCondition`, `evalVehicleCategory`, `evalOperatorSet`, `evalOperatorLoyalty`, `evalCabinClass` scannen `ctx.allJourneys` ohne mode (`engine.ts:144-155`, `188-217`, `231-251`, `298-300`). | `[LAUNCH]` + `[POST-LAUNCH]` |
| 29 non-cross Achievements ohne `rule.mode` | Catalog hat `appliesTo: flight/train`, aber Engine ignoriert `appliesTo` bewusst (`types.ts` Kommentar; praktisch sichtbar im Catalog). | `[LAUNCH]` |
| Operator-Code-Kollision `DB` | Brit Air und Deutsche Bahn teilen Code `DB`; Operator-Achievements matchen nur Code, nicht Mode. | `[LAUNCH]` + `[POST-LAUNCH]` |
| `equator_crosser` Endpoint-Edge | `crossesEquator` nutzt `a.latitude * b.latitude < 0` (`geo/index.ts:39-41`). Route von/zu genau 0.0° zaehlt nicht. | `[POLISH]` |
| Atlantic/Pacific Heuristik | Atlantic ist Longitude-Band-Heuristik (`geo/index.ts:43-54`), Pacific ist Antimeridian-Diff (`56-59`). Gut fuer Hauptfaelle, aber nicht geographisch exakt. | `[POLISH]` |
| Polar Sampling | Polar-Kreis wird ueber 64 Great-Circle-Punkte gesampelt (`geo/index.ts:61-70`). Sehr knappe Tangenten koennen verfehlt werden. | `[POLISH]` |

## Mental-Walkthroughs

| Achievement | Erwarteter Fall | Tatsaechlich |
|---|---|---|
| `first_train` | Eine Journey mit `mode = train`. | Funktioniert, weil `count` mit `mode: train` ueber `filterByMode` laeuft (`engine.ts:109-114`). |
| `transalpine` | Alpine Zugroute. | Nicht im Catalog gefunden. Unklar, ob Spec das weiterhin erwartet; Tim sollte selbst draufschauen. |
| `night_train` | Nachtzug/Overnight. | Kein `night_train` gefunden. `train_long_haul`/`train_marathon` haengen an Duration und triggern im Form-Pfad nicht. `sleeper_train` haengt an `cabinClass: sleeper` und kann funktionieren. |
| `first_class` vs `first_class_rail` | Flight first class soll Flight unlocken, Rail first class Rail unlocken. | Eine Train-Journey mit `trainClass: first` setzt `cabinClass: first` und kann Flight-`first_class` unlocken (`engine.ts:298-300`). |

## Stress-Test-Konzept

Wegen Read-only habe ich `scripts/codex-stress-test.ts` nicht als Datei angelegt. Das waere der empfohlene Inhalt/Ansatz:

```ts
/**
 * Concept only: do not run in production DB.
 * Goal: generate 5000 synthetic journeys over 20 years and compare expected
 * achievement unlocks with engine output.
 */
import catalog from '../docs/achievements.json';
import { evaluateAll } from '../src/lib/achievements/engine';

type Profile = {
  journeys: Journey[];
  locationsById: Map<string, Location>;
  operatorsById: Map<string, Operator>;
  vehiclesById: Map<string, Vehicle>;
  expected: Set<string>;
};

function buildProfile(seed: number): Profile {
  // Deterministic PRNG.
  // Create fixed airports/stations around: Europe, US, Asia, south hemisphere,
  // antimeridian, equator endpoints, polar routes.
  // Generate:
  // - 3000 flights, 1500 trains, 500 other
  // - known totals around thresholds: exactly threshold-1, threshold, threshold+1
  // - duplicate operator codes such as DB for flight/train
  // - cabinClass first/business/sleeper on both modes
  // - journeys with and without durationMinutes
  return { journeys: [], locationsById: new Map(), operatorsById: new Map(), vehiclesById: new Map(), expected: new Set() };
}

for (const seed of [1, 2, 3, 4, 5]) {
  const profile = buildProfile(seed);
  const actual = new Set(evaluateAll({
    allJourneys: profile.journeys,
    allUnlocks: [],
    locationsById: profile.locationsById,
    operatorsById: profile.operatorsById,
    vehiclesById: profile.vehiclesById,
  }, catalog as any).map((u) => u.achievementId));

  for (const id of profile.expected) {
    if (!actual.has(id)) throw new Error(`missing expected unlock ${id}`);
  }
  for (const id of actual) {
    if (!profile.expected.has(id)) throw new Error(`unexpected unlock ${id}`);
  }
}
```

Wichtig: Der Oracle darf nicht die Engine duplizieren. Er muss aus kontrollierten Profilen kommen: "genau 10 LH-Fluege", "genau eine DB-Train-Journey", "Flight mit cabin first, Train mit cabin first getrennt", "Route exakt ueber Equator", usw.

## Empfehlung

1. Engine soll `appliesTo` oder `rule.mode` fuer alle mode-spezifischen Achievements erzwingen. Am besten beim Catalog-Load normalisieren: non-cross ohne mode ist invalid.
2. Forms/Repository muessen `durationMinutes` berechnen oder Duration-Achievements aus dem Catalog entfernt/deaktiviert werden.
3. Operator-/Vehicle-Lookups sollten Mode mitpruefen, nicht nur Code/Kategorie.
4. Catalog-Test erweitern: `appliesTo !== "cross"` -> Rule muss mode haben oder Engine muss appliesTo filtern.

