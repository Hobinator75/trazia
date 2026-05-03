# Codex Cross-Audit v2 - UI-Edge-Cases

Read-only UI-Review, keine Simulator-/Device-Screenshots.

## Findings

| Bereich | Befund | Severity |
|---|---|---:|
| Phase-1-Sichtbarkeit | Zug ist aktuell sichtbar: `ModePicker.tsx:16-23`, `app/onboarding/modes.tsx:18-24`, `app/(tabs)/journeys/add.tsx:21-27`. Tim plant Hide vor Launch; der Release-Branch muss das wirklich tun. | `[LAUNCH]` |
| Light Theme | Settings haben `theme: 'dark' | 'light' | 'system'`, aber viele Screens hardcoden `bg-background-dark`, `text-text-light`, `surface-dark`. `useThemeBinding.ts:8-13` allein reicht nicht. `DateField.tsx:67-72` und `113-119` erzwingen `themeVariant="dark"`. | `[POLISH]` |
| iPad/Tablet | `app.json:6` erzwingt Portrait, `supportsTablet` ist true (`app.json:11-12`). Layout ist ueberwiegend mobile Single-Column. Kein Crash-Fund, aber "responsive iPad" ist nicht belegt. | `[POLISH]` |
| Accessibility | Einige Labels existieren, aber shared controls wie `SelectButton`/Segmented und viele Pressables verlassen sich auf sichtbaren Text oder Icons. Icon-/Modal-Flows brauchen VoiceOver/TalkBack-Smoke. | `[POLISH]` |
| Date/Time Picker | iOS Picker ist dark-hardcoded; im Light-System kann das visuell inkonsistent/kontrastarm werden. | `[POLISH]` |
| RTL | Keine i18n-/RTL-Architektur erkennbar; Pfeile, Reihenfolge und Texte sind hardcoded deutsch/LTR. Spaeter relevant, jetzt kein Launch-Blocker. | `[POST-LAUNCH]` |
| Achievement-Recalc waehrend UI rerendert | `recalculateAchievements` liest bestehende Unlocks und inserted neue ohne Transaction/Conflict-Ignore (`sync.ts:23-60`). Zwei parallele Recalcs koennen Unique-Conflict werfen und den Journey-Flow stoeren. | `[LAUNCH]` niedrig |
| Form-Zeitlogik | UI erlaubt Start-/Endzeit, aber keine Duration-Berechnung und keine Overnight-Erklaerung. Ergebnis: Duration-Achievements wirken kaputt, obwohl UI Daten annimmt. | `[LAUNCH]` |

## Fazit

Der groesste UI-bezogene Launch-Punkt ist nicht Layout, sondern Feature-Gating: Train muss wirklich versteckt werden. Danach sind Light Theme und Accessibility die naechsten ehrlichen Polish-Themen; Claude Codes "Polish erledigt" ist dort zu optimistisch.

