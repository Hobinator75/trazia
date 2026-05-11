# Light-Mode & i18n Coverage Audit — `feat/i18n-light-completion`

Snapshot after Bucket B completion: every user-facing screen routes its
strings through `useTranslation()` and uses `bg-foo-light dark:bg-foo-dark`
token pairs. Numbers route through `src/lib/i18n/formatNumber.ts` so group
separators follow the active locale.

## Screens — DE + EN i18n ✓ / Light + Dark ✓

### Onboarding
- `app/onboarding/language.tsx` — DE+EN ✓ / Light+Dark ✓ (Bucket B foundation)
- `app/onboarding/welcome.tsx` — DE+EN ✓ / Light+Dark ✓
- `app/onboarding/modes.tsx` — DE+EN ✓ / Light+Dark ✓
- `app/onboarding/first-journey.tsx` — DE+EN ✓ / Light+Dark ✓
- `app/onboarding/permissions.tsx` — DE+EN ✓ / Light+Dark ✓

### Tabs
- `app/(tabs)/_layout.tsx` — DE+EN ✓ / Light+Dark ✓
- `app/(tabs)/map/index.tsx` — DE+EN ✓ / Light+Dark ✓ (MapView2D + Globe3D theme-aware)
- `app/(tabs)/map/[id].tsx` — redirect-only, no surface

### Journeys
- `app/(tabs)/journeys/index.tsx` — DE+EN ✓ / Light+Dark ✓ (list + swipe + filters + actions)
- `app/(tabs)/journeys/[id].tsx` — DE+EN ✓ / Light+Dark ✓ (detail + more-menu + share/delete)
- `app/(tabs)/journeys/add.tsx` — DE+EN ✓ / Light+Dark ✓
- `app/(tabs)/journeys/edit/[id].tsx` — DE+EN ✓ / Light+Dark ✓

### Stats
- `app/(tabs)/stats/index.tsx` — DE+EN ✓ / Light+Dark ✓
- `app/(tabs)/stats/year-in-review.tsx` — DE+EN ✓ / Light+Dark ✓
- `app/(tabs)/stats/stat/[key].tsx` — DE+EN ✓ / Light+Dark ✓
- `app/(tabs)/stats/achievement/[id].tsx` — DE+EN ✓ / Light+Dark ✓

### Profile
- `app/(tabs)/profile/index.tsx` — DE+EN ✓ / Light+Dark ✓ (theme picker, language picker, settings)
- `app/(tabs)/profile/about.tsx` — DE+EN ✓ / Light+Dark ✓
- `app/(tabs)/profile/export.tsx` — DE+EN ✓ / Light+Dark ✓
- `app/(tabs)/profile/backup.tsx` — DE+EN ✓ / Light+Dark ✓
- `app/(tabs)/profile/premium.tsx` — DE+EN ✓ / Light+Dark ✓
- `app/(tabs)/profile/imprint.tsx` — DE+EN ✓ / Light+Dark ✓ (`resolveImprint(locale)` picks DE/EN)
- `app/(tabs)/profile/privacy.tsx` — DE only / Light+Dark ✓ ★
- `app/(tabs)/profile/terms.tsx` — DE only / Light+Dark ✓ ★

★ Privacy + Terms intentionally stay German. Auto-translating legal text
introduces liability — see the inline notes in those files for the
explicit rationale.

### Domain components
- `src/components/domain/Globe3D.tsx` — DE+EN n/a (no copy) / Light+Dark ✓
  (atmosphere shader switches to slate-blue `#1E3A8A` with 0.55 intensity
  scalar in light mode; journey tubes drop to 0.7 opacity)
- `src/components/domain/MapView2D.tsx` — DE+EN ✓ / Light+Dark ✓
  (passes resolved scheme to react-native-maps `userInterfaceStyle`)
- `src/components/domain/JourneyCard.tsx` — DE+EN ✓ / Light+Dark ✓
- `src/components/domain/JourneyActionSheet.tsx` — DE+EN ✓ / Light+Dark ✓
- `src/components/domain/JourneyFilterSheet.tsx` — DE+EN ✓ / Light+Dark ✓
- `src/components/domain/JourneyDetail/MapPreview.tsx` — DE+EN ✓ / Light+Dark ✓
- `src/components/domain/JourneyDetail/RouteHero.tsx` — DE+EN n/a / Light+Dark ✓
- `src/components/domain/ProfileHeader.tsx` — DE+EN ✓ / Light+Dark ✓
- `src/components/domain/EntitySearchModal.tsx` — DE+EN ✓ / Light+Dark ✓
- `src/components/domain/ModePicker.tsx` — DE+EN ✓ / Light+Dark ✓
- `src/components/domain/PremiumUpsellSheet.tsx` — DE+EN ✓ / Light+Dark ✓
- `src/components/domain/Achievements/AchievementCard.tsx` — DE+EN ✓ / Light+Dark ✓
- `src/components/domain/Stats/*` (Hero, QuickNumbers, Moon, TopRoutes, Charts,
  YearInReviewTeaser, AchievementsSection) — DE+EN ✓ / Light+Dark ✓
- `src/components/domain/AddJourney/{FlightForm,TrainForm,OtherForm}.tsx`
  — DE+EN ✓ / Light+Dark ✓

### UI primitives
- `src/components/ui/EmptyState.tsx`, `LoadingScreen.tsx`,
  `PlaceholderScreen.tsx`, `ErrorBoundary.tsx`, `Snackbar.tsx`,
  `Markdown.tsx`, `FormField.tsx` (+ TextField, SelectButton, Segmented),
  `DateField.tsx`, `TimeField.tsx`, `TagInput.tsx`, `AnimatedCounter.tsx`
  — DE+EN ✓ / Light+Dark ✓

## Known Light-Mode Issues

| File | Issue | Severity |
| --- | --- | --- |
| `app/(tabs)/profile/privacy.tsx` | Content stays German in EN locale | low — legal text, intentional |
| `app/(tabs)/profile/terms.tsx` | Content stays German in EN locale | low — legal text, intentional |
| `src/components/domain/AddJourney/{Flight,Train,OtherForm}.tsx` | `TAG_SUGGESTIONS` arrays stay German (`Geschäftsreise`, `Urlaub`, `Familie`, `Pendel`) | low — personal diary shorthand, see inline comment |

## Tests

- `src/i18n/__tests__/locale-coverage.test.ts` (added in this branch):
  - Asserts `de.json` and `en.json` expose the same flattened key set.
  - Asserts every key holds a non-empty string in both locales.
  - Asserts matching keys use the same `{{interpolation}}` variables in
    both locales.

- `src/lib/legal/__tests__/content.test.ts`: covers the imprint resolver
  + the German privacy contract.
- `src/lib/achievements/__tests__/localize.test.ts`: every catalog entry
  has a German translation (added in Bucket A).

## Locale-aware formatting

- Integer / float helpers: `src/lib/i18n/formatNumber.ts`
  (`formatInt(value, i18n.language)`, `formatFloat`).
- Dates: each formatter call passes the active `i18n.language` to
  `toLocaleDateString` — see JourneyCard, year-in-review, achievement
  detail.

## Phase-2/3 languages

Stays unchanged from Bucket B: `i18next` `fallbackLng = 'en'` covers
es/fr/it/pt/nl/pl/tr/ru/zh/ja/ko/ar until vetted JSON bundles arrive in
`src/i18n/locales/<code>.json`. Adding a bundle is a drop-in change —
the test suite above will then enforce key parity automatically.
