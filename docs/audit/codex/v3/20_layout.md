# 20 — Layout

## Verdict

Phone-Portrait ist brauchbar. Tablet/iPad ist nicht wirklich designed, obwohl `supportsTablet: true` gesetzt ist.

## Befunde

- App ist portrait-only (`app.json:6`).
- iOS `supportsTablet: true` (`app.json:12`), aber Layouts wirken primär phone-first; keine systematischen max-width/tablet split layouts gefunden.
- Safe Areas werden in Root, Onboarding, Forms, Map und Bottom Bars weitgehend beachtet.
- Empty States existieren für Journeys, Stats/Charts, Top Lists und No-Data-Views.
- Fixed Bottom Submit Bars haben ScrollView-Bottom-Padding; grundsätzlich okay.

## Risiken

- Tablet: breite Screens können gestreckt wirken.
- Font Scaling kann kompakte horizontale Controls brechen.
- Locked Mode Teaser und "Mehr Modi kommen bald!" sind Produkt-/Layout-Signale, die der aktuellen Phase-1-Vorgabe widersprechen.

