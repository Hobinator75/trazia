# 04 — Dead-Code, TODOs, Console

## TODO/FIXME/HACK/XXX

Produktive TODOs:

- `src/components/domain/Globe3D.tsx:177`: echter 3D-Globus post-launch.
- `src/components/domain/JourneyCard.tsx:159` und `:163`: Phase-2-Train-Metadaten.
- `src/lib/journeys/duration.ts:5`: timezone-aware Duration später.
- `src/lib/sound.ts:23`: echtes Unlock-Sound-Asset später.

Keiner davon ist für Flug-Phase-1 allein ein Blocker. Der Duration-TODO ist aber ein bewusstes Accuracy-Limit für internationale Flüge.

## Console Statements

- `src/components/ui/ErrorBoundary.tsx:22`: `console.error` nicht `__DEV__`-gated.
- `src/lib/observability/sentry.ts:62`, `:76`: dev-gated.
- `src/lib/observability/analytics.ts:71`: dev-gated.
- Scripts nutzen `console` erwartungsgemäß.

## Unused / Extra

- Alte React-Logo-Assets in `assets/images/` wirken unbenutzt.
- `Globe3D` ist bewusst ein SVG/2.5D-Placeholder.
- Train-Code ist absichtlich im Bundle, aber die UI-Gates sind nicht konsistent mit "nur Flug sichtbar".

