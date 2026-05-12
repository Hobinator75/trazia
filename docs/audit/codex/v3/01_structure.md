# 01 — Repo-Struktur

## Verdict

Struktur ist für eine Expo/React-Native-App sauber, aber README/alte Spec-Beschreibung ist veraltet. Wichtigster Drift: README nennt `src/i18n/`, das im aktuellen Tree nicht existiert; aktueller Code ist bewusst German-only (`src/stores/settings.store.ts:6`).

## FOUND

- `app/`: Expo Router mit Tabs, Journey-Add/Edit/Detail, Stats, Profile, Onboarding.
- `src/components/domain/`: AddJourney, Achievements, JourneyDetail, Stats, JourneyCard, Map/Globe.
- `src/components/ui/`: wiederverwendbare UI-Komponenten wie Toast, Snackbar, ErrorBoundary, FormField.
- `src/config/`: Feature Flags und Tests.
- `src/db/`: Drizzle Schema, migrations, repositories, seed, DB tests.
- `src/hooks/`: DB readiness, seed, migrations, stats, theme binding.
- `src/lib/`: achievements, ads, backup, export, forms, geo, iap, journeys, legal, observability, routes, stats.
- `src/stores/`: Zustand Stores.
- `src/theme/`: Farb- und Theme-Tokens.
- `src/types/`: Domain-Typen.
- `assets/static/`: Airports/Airlines/Aircraft plus Train-Kataloge.
- `assets/seed/trazia-seed.db`: pre-built Seed-DB.

## MISSING gegen README/Spec

- `src/i18n/` fehlt. Kommentar sagt German-only v1 (`src/stores/settings.store.ts:6`).
- README-Struktur ist nicht mehr repräsentativ für die aktuelle App; sie beschreibt eher frühe UI-/Setup-Phase als Launch-Codebase.
- Kein expliziter `docs/spec.md` oder ähnliche einzelne kanonische Spec gefunden; Audit musste README, Release-Checklist, Tests und Code kombinieren.

## EXTRA / bewusst im Bundle

- Train-Code und Train-Daten sind vorhanden, obwohl Feature-Flag aus ist.
- Auto/Schiff/Bus tauchen als locked Teaser in Onboarding/AddJourney auf, obwohl aktuelle Audit-Vorgabe "nur Flug sichtbar" sagt.
- Alte React-Logo-Bilddateien liegen noch in `assets/images/`; sie sind kein Launch-Bug, aber unnötiger Asset-Ballast.

