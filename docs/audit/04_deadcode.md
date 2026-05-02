# A4 — Dead Code, TODOs, Console-Statements

## TODOs / FIXMEs / HACK / XXX

```
src/components/domain/Globe3D.tsx:112  // batching TODO below applies.
src/components/domain/Globe3D.tsx:177  // TODO CC-3.5: real 3D globe
src/components/domain/JourneyCard.tsx:119  // TODO Phase 2: replace with rail-specific layout
src/components/domain/JourneyCard.tsx:123  // TODO Phase 2: replace with shortened address strings
src/components/domain/JourneyCard.tsx:127  // TODO Phase 2: replace with shipping-line logo
src/lib/sound.ts:17                        // TODO CC-3.7: replace this stub with the real expo-audio integration
```

Alle TODOs sind klar gelabelt mit Phase- bzw. CC-Ticket-Referenzen. Kein
verwaister `FIXME`/`HACK`. Bewertung: **gepflegt**.

### Kritischer TODO

- **`src/components/domain/Globe3D.tsx:177`**: Der gesamte 3D-Globus ist ein
  SVG-Fake (rotierte LinearGradient + projizierte Pfade). Tims Spec sagt
  „3D-Globus", die Kommentare im File geben die ehrliche Antwort — es ist
  Phase-1-Placeholder. Solange das nicht ersetzt wird, sind:
  - keine Tap-Targets auf den Linien (siehe A5/C2 S5),
  - keine Hemisphären-Occlusion,
  - keine Pinch-Zoom,
  - der „3D"-Schalter im UI eigentlich Marketing.

  Vor Launch: entweder den Tab als „Karte" umlabeln und 2D als Default,
  oder den 3D-Modus mit dem ehrlichen Hinweis im UI lassen (er ist da:
  „3D-Globus mit Earth-Textur + Atmosphäre kommt in CC-3.5"), aber dann
  **das 2D als Default** setzen, damit Tap auf Linien funktioniert.

## Console-Statements

```
src/components/ui/ErrorBoundary.tsx:22       console.error('ErrorBoundary caught:', error, info);
src/lib/observability/sentry.ts:62           if (__DEV__) console.error('[Sentry stub] would capture:', error, context);
src/lib/observability/analytics.ts:71        if (__DEV__) console.log('[analytics stub]', event, properties);
```

Alle drei sind **bewusst und korrekt**:
- ErrorBoundary darf in dev/prod loggen, das ist Standard.
- Sentry/PostHog Stubs werden mit `__DEV__` gegated und nur ausgegeben, wenn
  kein DSN/API-Key gesetzt ist (= nie in einer Release-Build).

Keine versehentlichen `console.log`-Reste. **Sauber.**

## `any`-Casts und `@ts-*`-Suppressions

(siehe 02_typescript.md) — keine, bis auf zwei Variablen, die zufällig
„any" heißen.

## Unused Exports / Dead Files

`ts-prune` und `knip` sind nicht installiert; manueller Spot-Check:

| Datei | Status |
| --- | --- |
| `src/lib/sound.ts` | Stub, exportiert `playAchievementChime`. Konsumiert in `AchievementToast.tsx`. **lebend.** |
| `src/lib/routes/index.ts` | Lese-Probe nicht gemacht; vermutlich Phase-3-Placeholder. |
| `src/lib/geo/index.ts:162` | `export { TWO_PI }` mit Kommentar — wird nicht verwendet, soll aber ein Helper für später sein. **Mittel-Smell** — entfernen oder direkt brauchen. |
| `src/db/__tests__/test-db.ts` | Test-Helper; nur in Tests genutzt. **lebend.** |
| `src/components/ui/PlaceholderScreen.tsx` | wird in `app/(tabs)/journeys/edit/[id].tsx` und `app/(tabs)/stats/stat/[key].tsx` benutzt. **lebend** — aber siehe unten: beide Edit-/Stat-Detail-Screens sind reine Platzhalter („CC-3.5 / CC-3.6"). Edit-Flow ist also faktisch leer. |
| `src/lib/legal/content.ts` | wird in profile/{about,terms,imprint,privacy}.tsx geladen. **lebend.** |
| `src/i18n/index.ts` | Wird **nirgends** importiert (außer von sich selbst). Alle UI-Strings sind hardcoded auf Deutsch. **Toter Subsystem.** Entweder integrieren (Profile-Sprachschalter macht aktuell nichts) oder löschen. |
| `src/types/domain-types.ts` | im DB-Schema importiert. **lebend.** |

## Kritisches Placeholder-Sub-System

Zwei Screens, die laut Spec/Test-Drehbuch funktionieren MÜSSEN, sind reine
Platzhalter:

- **`app/(tabs)/journeys/edit/[id].tsx`** → zeigt nur „Bearbeitungs-Form für
  Reise {id}. Kommt in CC-3.5." Kein Edit-Flow! Im JourneyActionSheet wird
  „Bearbeiten" angeboten, der Push gelingt — aber dann steht der User im
  Nirgendwo.
- **`app/(tabs)/stats/stat/[key].tsx`** → „Drilldown für '{key}' — kommt in
  CC-3.6." Stats-Detail-Drill-down nicht implementiert.

Das ist **kritisch** für S5/S6 im Test-Drehbuch (siehe 11_test_script.md).

## Empfehlung

| Aktion | Aufwand |
| --- | --- |
| **Edit-Form für Journeys umsetzen** (FlightForm wiederverwenden mit defaultValues aus DB) | 4-6 h |
| **Stats-Drilldown** umsetzen oder die Tap-Targets disablen, damit nichts kaputt aussieht | 1-2 h (disable) / 8-12 h (real) |
| `src/lib/geo/index.ts:162 TWO_PI`-Re-Export entfernen | 2 min |
| `src/i18n/`: entweder mit `react-native-localize` + `i18next` real anschließen oder den ganzen Ordner löschen | 2-4 h (real anschließen) / 5 min (löschen) |
| AchievementToast `eslint-disable` mit WHY-Kommentar versehen | 5 min |
| Globe3D-Default auf „2D" wechseln, bis CC-3.5 fertig ist | 10 min |
