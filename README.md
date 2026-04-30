# Trazia – App

React-Native-/Expo-Anwendung von Trazia. iOS, Android und Web werden vom selben
Code-Stand bedient (Expo SDK 54, React Native 0.81, expo-router).

## Stack

| Bereich            | Technologie                                          |
| ------------------ | ---------------------------------------------------- |
| Framework          | Expo SDK 54 + React Native 0.81                      |
| Sprache            | TypeScript (strict, `noUncheckedIndexedAccess`)      |
| Routing            | expo-router (file-based, typed routes)               |
| Styling            | NativeWind v4 + Tailwind 3                           |
| State              | Zustand                                              |
| Lokale DB          | expo-sqlite + drizzle-orm (drizzle-kit für Migrate)  |
| Datum/Zeitzonen    | date-fns + date-fns-tz                               |
| Formulare          | react-hook-form + zod                                |
| Lint/Format        | ESLint (flat config) + Prettier + Tailwind-Plugin    |
| i18n               | de/en JSON (siehe `src/i18n/`)                       |

## Voraussetzungen

- Node.js ≥ 20 (getestet mit Node 24)
- Xcode + iOS Simulator (für `npm run ios`)
- Android Studio + Android Emulator (für `npm run android`)
- Optional: Expo Go auf einem physischen Gerät

## Setup

```bash
cd Trazia/app
npm install
```

Anschließend:

```bash
npm run ios       # iOS-Simulator starten
npm run android   # Android-Emulator starten
npm run web       # Web im Browser
npm start         # Metro mit Auswahl
```

## Skripte

| Skript                | Zweck                                                  |
| --------------------- | ------------------------------------------------------ |
| `npm start`           | Expo Dev-Server starten                                |
| `npm run ios`         | iOS-Simulator                                          |
| `npm run android`     | Android-Emulator                                       |
| `npm run web`         | Web-Build im Browser                                   |
| `npm run lint`        | ESLint (`expo lint`)                                   |
| `npm run format`      | Prettier auf alle Dateien anwenden                     |
| `npm run format:check`| Prettier-Diff-Check (CI)                               |
| `npm run typecheck`   | TypeScript ohne Emit prüfen (`tsc --noEmit`)           |
| `npm run db:generate` | Drizzle-Migrationen aus dem Schema generieren          |
| `npm run db:migrate`  | Generierte Migrationen anwenden                        |

## Projektstruktur

```
app/                          # expo-router Dateien (Routen)
src/
├── components/
│   ├── ui/                   # generisch: Button, Card, Sheet, Modal, ...
│   └── domain/               # JourneyCard, GlobeView, MapView, ...
├── db/
│   ├── schema.ts             # Drizzle-Schema (operators, locations, journeys, achievements)
│   ├── client.ts             # SQLite-/Drizzle-Initialisierung
│   ├── repositories/         # Repository-Layer pro Entity
│   └── seed/                 # Initial-Seed aus JSON-Daten
├── lib/
│   ├── geo/                  # Haversine, Großkreis, Bounding-Boxen
│   ├── achievements/         # Achievement-Engine
│   ├── stats/                # Aggregationen
│   └── routes/               # Route-Generation
├── data/
│   └── static/               # Symlinks/Kopien zu /data/processed/
├── stores/                   # Zustand Stores (Settings, ...)
├── types/                    # TypeScript-Typen, inkl. domain-types.ts
├── theme/                    # Farben, Typografie (Quelle für Tailwind-Mapping)
├── hooks/                    # React-Hooks (Custom)
└── i18n/                     # de.json, en.json
```

## Pfad-Aliase

- `@/*` → `src/*`
- `@app/*` → `app/*`

Beispiele:

```ts
import { db } from '@/db/client';
import { useSettingsStore } from '@/stores';
```

## Theme

Default ist **Dark Mode** (`userInterfaceStyle: 'dark'` in `app.json`).
Die Farben sind in `tailwind.config.js` und `src/theme/colors.ts` synchron gehalten:

| Token                | Hex         | Verwendung           |
| -------------------- | ----------- | -------------------- |
| `primary`            | `#3B82F6`   | Flight blue          |
| `secondary`          | `#10B981`   | Train green          |
| `accent`             | `#F97316`   | Car orange           |
| `ocean`              | `#06B6D4`   | Ship cyan            |
| `background-dark`    | `#0A0E1A`   | App-Hintergrund      |
| `surface-dark`       | `#111827`   | Karten/Sheets        |
| `text-light`         | `#F9FAFB`   | Primärtext           |
| `text-muted`         | `#9CA3AF`   | Sekundärtext         |

NativeWind-Klassen z. B.:

```tsx
<View className="flex-1 bg-background-dark">
  <Text className="text-text-light">Hallo</Text>
  <Text className="text-text-muted">Untertext</Text>
</View>
```

## Datenbank (Drizzle + expo-sqlite)

Die SQLite-Datenbank wird einmalig per `openDatabaseSync('trazia.db')` geöffnet und
mit `drizzle-orm/expo-sqlite` umschlossen (`src/db/client.ts`).

Schema in `src/db/schema.ts`. Migrationen werden mit `drizzle-kit` aus dem
Schema generiert (`npm run db:generate`) und liegen unter `drizzle/`.

Repositories kapseln die DB-Zugriffe:
- `src/db/repositories/journey.repository.ts`
- `src/db/repositories/location.repository.ts`
- `src/db/repositories/operator.repository.ts`
- `src/db/repositories/achievement.repository.ts`

## Code-Stil

- ESLint flat config (`eslint.config.js`) basiert auf `eslint-config-expo`
  und deaktiviert kollidierende Regeln über `eslint-config-prettier`.
- Prettier-Konfiguration in `.prettierrc`, inkl. `prettier-plugin-tailwindcss`
  für stabile Klassenreihenfolge.

```bash
npm run lint
npm run format
npm run typecheck
```

## Nächste Schritte

Diese Codebasis enthält bewusst nur das Setup. UI- und Feature-Implementierung
folgen in separaten Schritten.
