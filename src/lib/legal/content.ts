// Legal copy lives here in TypeScript so Metro doesn't need a special
// transformer for raw .md imports. The canonical source documents are the
// matching files under docs/{privacy-policy,imprint,terms}-de.md — when
// updating, change both. The Markdown component re-implements the subset
// we care about (headings, paragraphs, bullets, **bold**, links).

export const PRIVACY_POLICY_DE = `# Datenschutzerklärung

Stand: Mai 2026

Trazia ist eine lokal-zentrierte Reise-Tracking-App. Die folgenden Punkte
beschreiben, welche Daten verarbeitet werden, zu welchem Zweck und an wen
sie weitergegeben werden.

## Lokale Datenverarbeitung

Alle erfassten Reisedaten (Routen, Fotos, Tags, Notizen) werden ausschließlich
lokal auf deinem Gerät in einer SQLite-Datenbank gespeichert. Es gibt keinen
Server-Sync, keinen Account und keine zentrale Cloud-Datenbank. Lokale Daten
verlassen dein Gerät nur, wenn du selbst einen **Daten-Export** anstößt.

## Verarbeitete Daten und Drittanbieter

Trazia bindet die folgenden Drittanbieter ein. Du kannst die jeweils
relevanten Datenströme über **Profil → Einstellungen** abschalten.

### Crash-Reports

Trazia versendet **derzeit keine** Crash-Reports an Dritte. Die App-interne
Einstellung „Crash-Reports senden" steuert eine zukünftige Integration:
Sollten wir später ein DSGVO-konformes Crash-Reporting mit EU-Hosting
einbinden, kündigen wir das **mindestens 14 Tage vor dem Update** im
Release-Hinweis an. Du kannst den Toggle bereits jetzt ausschalten — die
Voreinstellung wird respektiert, sobald die Integration aktiv ist.

### PostHog — anonyme Nutzungsstatistiken

- Zweck: aggregierte, anonyme Nutzungsmetriken (z. B. „wie viele Nutzer
  öffnen den Statistik-Tab pro Woche?"), um Produktentscheidungen zu
  treffen.
- Datenkategorien: Event-Name, Zeitstempel, App-Version. **Keine**
  personenbezogenen Daten und keine Reise-Inhalte.
- Hosting: PostHog EU (Frankfurt).
- Steuerung: standardmäßig **ausgeschaltet** (Opt-In). Du musst PostHog
  in „Profil → Einstellungen → Anonyme Nutzungsstatistiken" aktiv
  einschalten.

### Google AdMob — Werbung

Trazia zeigt Werbung über **Google AdMob**. Vor der ersten Anzeige
fragen wir über das Consent-Sheet (Google UMP) deine Einwilligung ab.
Ohne Zustimmung werden ausschließlich nicht-personalisierte Anzeigen
ausgeliefert. Premium-Nutzer:innen sehen keinerlei Werbung.

Trazia ruft auf iOS aktuell **kein App-Tracking-Transparency (ATT)**-
Sheet auf — wir nutzen kein IDFA und kein Cross-App-Tracking. Sollte
sich das ändern, wird der ATT-Prompt vor jeglicher entsprechender
Anzeige eingeholt.

### RevenueCat — In-App-Käufe

Premium-Abonnements werden über **RevenueCat** (Apple App Store / Google
Play) abgewickelt. Wir erhalten von RevenueCat lediglich pseudonyme
Status-Informationen zum Abo (aktiv / inaktiv). Zahlungs- und persönliche
Daten verbleiben beim jeweiligen App-Store.

## Auskunft, Löschung, Widerspruch

- Du kannst alle Daten jederzeit per **Profil → Einstellungen → Daten
  exportieren** als JSON herunterladen.
- Du kannst alle Daten jederzeit über **Profil → Einstellungen → Alle
  Daten löschen** unwiderruflich entfernen.
- Du kannst die PostHog-Übermittlung jederzeit in den Einstellungen
  abschalten — bereits gesendete Events sind anonymisiert und nicht zu
  dir rückverfolgbar.
- Eine Auskunfts- oder Löschanfrage an einen Trazia-Server entfällt,
  weil außer den oben genannten Drittanbieter-Streams keine Daten
  zentral gespeichert werden.

## Kontakt

Bei Fragen zu dieser Datenschutzerklärung erreichst du den
Verantwortlichen unter
[info@trazia.app](mailto:info@trazia.app).
`;

export const IMPRINT_DE = `## Impressum

Angaben gemäß § 5 TMG:

**HVS - Hobrlant Vertrieb & Service**

vertreten durch Tim Hobrlant

Döllstädtstraße 5
99423 Weimar
Deutschland

## Kontakt

E-Mail: [info@trazia.app](mailto:info@trazia.app)

## Verantwortlich für den Inhalt

Tim Hobrlant, Anschrift wie oben.

## Haftung für Inhalte

Die Inhalte unserer App wurden mit größtmöglicher Sorgfalt erstellt. Für die
Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch
keine Gewähr übernehmen.

## Haftung für Links

Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte
wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte
keine Gewähr übernehmen.
`;

export const IMPRINT_EN = `## Imprint

Information pursuant to § 5 TMG:

**HVS - Hobrlant Vertrieb & Service**

represented by Tim Hobrlant

Döllstädtstraße 5
99423 Weimar
Germany

## Contact

Email: [info@trazia.app](mailto:info@trazia.app)

## Responsible for the content

Tim Hobrlant, address as above.

## Liability for content

The contents of our app were created with the greatest possible care.
However, we cannot guarantee the accuracy, completeness, or timeliness
of the content.

## Liability for links

Our offering contains links to external third-party websites whose
contents we have no influence over. Therefore, we cannot assume any
liability for these external contents.
`;

export function resolveImprint(locale: string | null | undefined): string {
  if (typeof locale === 'string' && /^de\b/i.test(locale)) return IMPRINT_DE;
  return IMPRINT_EN;
}

export const TERMS_DE = `## Allgemeine Geschäftsbedingungen

Stand: Mai 2026

Diese AGB regeln die Nutzung der Trazia-App.

## 1. Geltungsbereich

Die AGB gelten für die Nutzung der Trazia-App in der jeweils aktuellen
Version, einschließlich kostenpflichtiger Premium-Abonnements.

## 2. Premium-Abonnements

Premium-Abonnements werden über deinen App-Store-Account abgerechnet. Es
gelten die jeweiligen Stornierungs- und Rückerstattungs­regelungen des
Stores. Trazia selbst kann keine Erstattungen vornehmen.

- **Monatlich:** verlängert sich automatisch um einen Monat, falls du nicht
  spätestens 24 Stunden vor Ablauf kündigst.
- **Jährlich:** beinhaltet eine kostenlose Testphase von 7 Tagen. Danach
  verlängert sich das Abo automatisch um ein Jahr, falls du nicht
  spätestens 24 Stunden vor Ablauf kündigst.

## 3. Pflichten der Nutzer:innen

Du bist verantwortlich für die Richtigkeit der erfassten Reisedaten. Trazia
übernimmt keine Haftung für etwaige Folgen falsch eingetragener Daten.

## 4. Schlussbestimmungen

Es gilt deutsches Recht. Sollte eine Bestimmung dieser AGB unwirksam sein,
bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
`;
