# A2 — TypeScript-Health

```
$ npx tsc --noEmit
EXIT=0
```

**Sauber.** Keine Type-Fehler. `tsconfig.json` ist strict + `noUncheckedIndexedAccess`,
das macht den grünen Lauf bedeutsam — Tims Tooling fängt also wirklich was.

## Code-Smells (`any`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`)

Vollständige Suche im src/+app/-Tree:

| Datei | Zeile | Smell | Bewertung |
| --- | --- | --- | --- |
| `src/components/ui/AchievementToast.tsx` | 68 | `// eslint-disable-next-line react-hooks/exhaustive-deps` | **kosmetisch** — bewusst, kommentiert nicht aber unbegründet; sollte einen WHY-Kommentar bekommen oder die Deps korrigieren. |
| `src/lib/achievements/__tests__/engine.test.ts` | 275-286 | Lokale `const any: …` (Variable heißt „any") | **kosmetisch** — Variablenname, kein TS-Cast. Lesbarkeit unschön; Rename in `anyMatch` empfohlen. |

**Keine** `as any`-Casts, keine `@ts-ignore`/`@ts-expect-error`, keine
`@ts-nocheck`. Das ist beachtlich für eine Codebase dieser Größe.

## Implizite Risiken

- `src/lib/achievements/engine.ts:11` importiert `docs/achievements.json` per
  relativem Pfad (`../../../docs/achievements.json`). Das funktioniert dank
  TS' resolveJsonModule, aber: Wenn der Import-Pfad bricht (z. B.
  `docs/`-Verschiebung), gibt TypeScript einen Fehler aus, **aber Metro
  bündelt die Datei nicht von alleine** — Tests laufen, App crasht zur
  Laufzeit. Empfehlung: nach `src/data/static/achievements.json`
  verschieben und über Path-Alias importieren.

- `src/db/schema.ts:7` typisiert `mode` und `category` der `vehicles`-Tabelle
  als `text(...)` ohne `$type<...>()`-Wrapper auf `category` — das öffnet
  beliebige Strings. Engine erwartet aber konkrete Werte (`widebody`,
  `narrowbody`, etc.). Reine Konvention; Type-Engine fängt das nicht.

- `src/db/schema.ts:121` — `journeys.routeType` ist `text` ohne Enum-
  Constraint. Im FlightForm wird `'great_circle'` reingeschrieben, im
  OtherForm `'bezier'`, aber kein Type-System verbietet andere Strings.

## Bewertung

| Schweregrad | Anzahl |
| --- | --- |
| Kritisch | 0 |
| Mittel | 0 |
| Kosmetisch | 2 |

TypeScript-Setup ist überdurchschnittlich solide. Nichts blockiert den
Launch.
