# Codex Cross-Audit v2 - Build-/Release-Readiness

## Metro `.sql`-Bundle-Blocker

STATUS_OPT liegt hier im Kern richtig. Der Code importiert SQL als Source:

- `src/db/migrations/migrations.js:3-7` importiert `./0000_initial.sql` usw.
- `metro.config.js:6` fuegt `.sql` zu `sourceExts` hinzu.
- `babel.config.js:1-6` hat keinen Inline-Import-/SQL-Transformer.

Expo dokumentiert, dass Metro Dateien entweder als Source oder Asset behandelt und Erweiterungen explizit ueber `sourceExts`/`assetExts` laufen ([Expo Metro docs](https://docs.expo.dev/guides/customizing-metro/)). `.db` als Asset ist korrekt (`metro.config.js:10`, vgl. Expo-Beispiel fuer `assetExts`), `.sql` als Source braucht aber Transformation in einen JS-String.

### Optionen

| Option | Bewertung |
|---|---|
| A: `.sql` per Inline-Import/Babel-/Metro-Transformer in Strings verwandeln | Beste kurzfristige Loesung. Passt zum aktuellen `migrations.js`-Muster. |
| B: Migrationen als generierte TS/JS-String-Datei committen | Robusteste langfristige Loesung; kein Sonderfall im Metro-Parser. |
| C: `.sql` als Asset behandeln | Nicht passend, weil Drizzle/Expo-Migrator die Migrationen als JS-importierte Strings erwartet, nicht als Asset-URI. |

Empfehlung: kurzfristig A, mittelfristig B mit Generator, der `migrations.js` konsistent erzeugt.

## iOS Privacy / App Store

Apple verlangt korrekte Privacy-Manifeste und App-Privacy-Angaben inklusive Drittpartnern. Relevante Primärquellen:

- Apple: Third-party SDK privacy manifests und Signatures ([Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/)).
- Apple: App Privacy Details muessen auch Drittpartner-Code abdecken ([App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)).

Lokaler Befund:

- `app.json:19-34` deklariert UserDefaults und FileTimestamp.
- `docs/privacy-policy-de.md:15-27` nennt AdMob und RevenueCat, aber nicht Sentry/PostHog.
- `app/_layout.tsx:33-41` initialisiert Sentry, Analytics und Ads beim Root-Start.
- `settings.store.ts:15-19`, `37-38` setzt Crash-Reports default ON und Analytics default OFF.

Bewertung: Privacy-Policy und App-Store-Privacy-Antworten sind vor Submit nicht vollstaendig, wenn Sentry/PostHog im Production-Build aktiv sind. Ob alle nativen SDK-Privacy-Manifeste korrekt gebundled werden, kann erst nach `expo prebuild`/EAS Build mit Xcode Privacy Report sicher verifiziert werden.

## AdMob

Google sagt explizit, Demo-Ad-Units vor Publishing durch eigene IDs zu ersetzen ([AdMob Test Ads](https://developers.google.com/admob/android/test-ads)). Trazia nutzt aktuell Sample-App-IDs in `app.json:79-83` und Test-Unit-Fallbacks in `src/lib/ads/units.ts:9-14`. `RELEASE_CHECKLIST.md:10-13` markiert das selbst als Hard-Stop.

Bewertung: Nicht App-Crash, aber Production-Submit/Monetarisierung nicht launch-ready, solange echte IDs/EAS Secrets fehlen.

## Sentry / Crash Opt-In

Der Code ist technisch ruecksichtsvoll: ohne DSN bleibt Sentry inert, und `beforeSend` kann anhand Settings filtern. Aber:

- Crash-Reports sind default ON (`settings.store.ts:37`).
- Privacy-Policy erwaehnt Sentry nicht.
- Sentry-Conflict-Reports fuer Achievement-Migrationen passieren bei reinen Conflicts nicht (`useAchievementMigrations.ts:35-45`).

Empfehlung: Entweder Privacy-Policy/App-Privacy aktualisieren und Toggle im Onboarding/Profil klar halten, oder Sentry bis nach Launch deaktivieren.

## App-Store-Review-Risiken

| Risiko | Status | Severity |
|---|---|---:|
| `.sql` bundling bricht `expo export` | STATUS_OPT plausibel, Config bestaetigt. | `[LAUNCH]` |
| AdMob Test IDs | Lokal noch Test-IDs/Fallbacks. | `[LAUNCH]` |
| Privacy-Policy ohne Sentry/PostHog | Lokal unvollstaendig. | `[LAUNCH]` |
| Apple IDs / Team / ASC | `RELEASE_CHECKLIST.md:20-23` markiert offen. | `[LAUNCH]` |
| Train sichtbar trotz Phase-1-only Launch | Code aktuell aktiv. | `[LAUNCH]` |
| Bahnhofsdaten nur 124 | Dokumentierter Post-Launch-Trade-off. | `[POST-LAUNCH]` |

## Empfehlung

Vor Phase-1-Submit: `.sql`-Bundling fixen, echte AdMob IDs setzen, Privacy-Policy/App-Privacy fuer Sentry/PostHog/Ads finalisieren, Train im Release-Branch verstecken, und einen echten Device-Smoke fuer Seed-DB + Migrationen fahren.

