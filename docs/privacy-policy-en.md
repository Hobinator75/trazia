# Privacy Policy

Last updated: May 2026

Trazia is a local-first travel-tracking app. The following sections describe
which data is processed, for which purpose, and which third parties (if any)
receive it.

## Local processing

All travel data you enter — routes, photos, tags, notes — stays exclusively
on your device. The MVP has no server sync, no account, and no central
database.

## Processed data and third parties

Trazia integrates the third-party services below. You can disable each
data stream individually under **Profile → Settings**.

### Sentry — crash reports

- Purpose: anonymized stack traces when the app crashes, so we can
  reproduce and fix bugs.
- Data categories: stack trace, app version, OS version, device class
  (e.g. "iPhone 15"). **No** travel, photo, or location data.
- Hosting: Sentry GmbH, Frankfurt am Main (EU, GDPR).
- Control: enabled by default, toggle off in
  "Settings → Send crash reports".
- Pseudonymization: we never send a user ID; the SDK runs with
  `sendDefaultPii: false`.

### PostHog — anonymous usage analytics

- Purpose: aggregated, anonymous usage metrics (e.g. "how many users
  open the stats tab per week?") to guide product decisions.
- Data categories: event name, timestamp, app version. **No**
  personally identifying information and no journey contents.
- Hosting: PostHog EU (Frankfurt).
- Control: **disabled by default** (opt-in). You have to enable it
  manually under "Settings → Anonymous usage analytics".

### Google AdMob — ads

Trazia displays ads through **Google AdMob**. Before the first ad, we
present Google's UMP consent sheet. Without consent, only non-personalized
ads are served. Premium users never see any ads.

### RevenueCat — in-app purchases

Premium subscriptions are handled through **RevenueCat** (Apple App Store /
Google Play). RevenueCat sends us only a pseudonymous subscription status
(active / inactive). Payment details and personal data stay with the
respective app store.

## Access, deletion, and objection

- Export all of your data as JSON at any time via the **Data Export** screen.
- Delete all data irreversibly at any time via
  **Profile → Data → Delete all data**.
- Disable Sentry / PostHog at any time in Settings — events already sent
  are anonymized and not traceable back to you.
- A subject-access or deletion request against a Trazia server is not
  applicable, because no data is stored centrally outside the third-party
  streams listed above.

## Contact

For questions about this privacy policy, please contact the data controller
at [tim.hobrlant@gmail.com](mailto:tim.hobrlant@gmail.com).
