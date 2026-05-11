# Datenschutzerklärung

Stand: Mai 2026

Trazia ist eine lokal-zentrierte Reise-Tracking-App. Die folgenden Punkte
beschreiben, welche Daten verarbeitet werden, zu welchem Zweck und an wen
sie weitergegeben werden.

## Lokale Datenverarbeitung

Alle erfassten Reisedaten (Routen, Fotos, Tags, Notizen) werden ausschließlich
lokal auf deinem Gerät gespeichert. Es gibt im MVP keinen Server-Sync, keinen
Account und keine zentrale Datenbank.

## Verarbeitete Daten und Drittanbieter

Trazia bindet die folgenden Drittanbieter ein. Du kannst die jeweils relevanten
Datenströme über **Profil → Einstellungen** abschalten.

### Sentry — Crash-Reports

- Zweck: anonyme Stack-Traces, wenn die App abstürzt, damit wir Fehler
  reproduzieren und beheben können.
- Datenkategorien: Stack-Trace, App-Version, OS-Version, Geräteklasse
  (z. B. „iPhone 15"). **Keine** Reise-, Foto- oder Standortdaten.
- Hosting: Sentry GmbH, Frankfurt am Main (EU, DSGVO).
- Steuerung: standardmäßig **eingeschaltet**, abschaltbar in
  „Einstellungen → Crash-Reports senden".
- Pseudonymisierung: Sentry erhält von uns keine User-ID; das SDK ist mit
  `sendDefaultPii: false` konfiguriert.

### PostHog — anonyme Nutzungsstatistiken

- Zweck: aggregierte, anonyme Nutzungsmetriken (z. B. „wie viele Nutzer
  öffnen den Statistik-Tab pro Woche?"), um Produktentscheidungen zu
  treffen.
- Datenkategorien: Event-Name, Zeitstempel, App-Version. **Keine**
  personenbezogenen Daten und keine Reise-Inhalte.
- Hosting: PostHog EU (Frankfurt).
- Steuerung: standardmäßig **ausgeschaltet** (Opt-In). Du musst PostHog
  in „Einstellungen → Anonyme Nutzungsstatistiken" aktiv einschalten.

### Google AdMob — Werbung

Trazia zeigt Werbung über **Google AdMob**. Vor der ersten Anzeige fragen wir
über das Consent-Sheet (Google UMP) deine Einwilligung ab. Ohne Zustimmung
werden ausschließlich nicht-personalisierte Anzeigen ausgeliefert. Premium-
Nutzer:innen sehen keinerlei Werbung.

### RevenueCat — In-App-Käufe

Premium-Abonnements werden über **RevenueCat** (Apple App Store / Google Play)
abgewickelt. Wir erhalten von RevenueCat lediglich pseudonyme Status-Informationen
zum Abo (aktiv / inaktiv). Zahlungs- und persönliche Daten verbleiben beim
jeweiligen App-Store.

## Auskunft, Löschung, Widerspruch

- Du kannst alle Daten jederzeit per **Daten-Export** als JSON herunterladen.
- Du kannst alle Daten jederzeit über **Profil → Daten → Alle Daten löschen**
  unwiderruflich entfernen.
- Du kannst Sentry-/PostHog-Übermittlung jederzeit in den Einstellungen
  abschalten — bereits gesendete Events sind anonymisiert und nicht zu dir
  rückverfolgbar.
- Eine Auskunfts- oder Löschanfrage an einen Trazia-Server entfällt, weil
  außer den oben genannten Drittanbieter-Streams keine Daten zentral
  gespeichert werden.

## Kontakt

Bei Fragen zu dieser Datenschutzerklärung erreichst du den Verantwortlichen
unter [info@trazia.app](mailto:info@trazia.app).
