# 18 — Theme Handling

## Verdict

Dark Mode ist konsistent genug. Light/System ist als User-Feature nicht launch-reif.

## Befunde

- Farb-Tokens haben dark/light Werte (`src/theme/colors.ts`).
- RootLayout wählt Navigation Theme per System `useColorScheme()` (`app/_layout.tsx:27`), nicht per Settings-Store.
- Settings-Store hat `theme: 'dark' | 'light' | 'system'`, aber ist nicht persistiert (`src/stores/settings.store.ts:10`).
- Viele Komponenten hardcoden `bg-background-dark`, `bg-surface-dark`, `text-text-light`, `border-border-dark` statt responsive Theme-Klassen; Beispiele: AddJourney (`app/(tabs)/journeys/add.tsx:35`), FormField (`src/components/ui/FormField.tsx:35`), Charts (`src/components/domain/Stats/ChartsSection.tsx:17`).
- `app.json` setzt `userInterfaceStyle: "dark"` (`app.json:9`).

## Bewertung

Wenn Trazia offiziell dark-only shippt, okay. Wenn Profil einen Light/System-Toggle zeigt, ist das ein UX-Bug: Toggle ist nicht dauerhaft und wirkt nur teilweise.

