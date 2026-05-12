# 02 — TypeScript & Lint

## Verifikation

- `npm run typecheck`: grün.
- `npm run lint`: grün.
- `npm run format:check`: rot, Prettier meldet 28 Dateien.

## TypeScript

- `strict: true` aktiv (`tsconfig.json`).
- Zusätzliche sinnvolle Guards: `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`.
- Keine `@ts-ignore`/`@ts-expect-error` im produktiven Source gefunden.
- Keine relevanten `as any`-Casts im produktiven Source gefunden. Auffällig ist nur ein legitimer `rest as NewJourney` in `duplicateJourney()` (`src/db/repositories/journey.repository.ts:160`).

## Lint / Suppressions

Gefundene produktive `eslint-disable-next-line`:

- `src/components/ui/AchievementToast.tsx:68`: Hook-Deps werden unterdrückt; funktional nachvollziehbar, aber Kommentar erklärt nicht, warum `hide` bewusst nicht stabilisiert wird.
- `src/components/domain/AddJourney/FlightForm.tsx:149`, `TrainForm.tsx:141`, `OtherForm.tsx:139`: Form-Reset/Editing-Deps bewusst begrenzt; akzeptabel.
- `src/lib/sound.ts:23`: TODO-Kommentar zum späteren Audio-Asset.

## Code-Smells

- `console.error` in `src/components/ui/ErrorBoundary.tsx:22` ist nicht `__DEV__`-gated. Für ErrorBoundary kann das in Dev okay sein; in Production sollte Sentry/Logger reichen.
- `console` in Observability ist dev-gated (`src/lib/observability/sentry.ts:62`, `src/lib/observability/analytics.ts:71`).
- Formatierung ist der einzige harte Tooling-Fail. Vor Submit beheben, weil sonst "alles grün" nicht ehrlich ist.

