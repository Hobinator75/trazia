// Lazy-loaded so the module is safe to import in environments where the
// native binding is absent (Expo Go, Node tests, web preview). Callers must
// gate on configureAds() resolving with `available: true`.

let cachedSdk: typeof import('react-native-google-mobile-ads') | null = null;
let configurePromise: Promise<{ available: boolean }> | null = null;
let consentRequested = false;

async function loadSdk() {
  if (cachedSdk) return cachedSdk;
  try {
    cachedSdk = await import('react-native-google-mobile-ads');
    return cachedSdk;
  } catch {
    return null;
  }
}

export async function configureAds(): Promise<{ available: boolean }> {
  if (configurePromise) return configurePromise;
  configurePromise = (async () => {
    const sdk = await loadSdk();
    if (!sdk) return { available: false };
    try {
      await sdk.default().initialize();
      return { available: true };
    } catch {
      return { available: false };
    }
  })();
  return configurePromise;
}

export interface UmpStatus {
  canRequestAds: boolean;
}

// Request the UMP consent form on first launch (GDPR/CCPA). On EEA users
// the form gates personalised ads; elsewhere it short-circuits to
// "obtained" without showing any UI.
let lastConsentResult: UmpStatus | null = null;

export async function ensureConsent(): Promise<UmpStatus> {
  if (consentRequested) return lastConsentResult ?? { canRequestAds: false };
  consentRequested = true;
  const sdk = await loadSdk();
  if (!sdk) {
    lastConsentResult = { canRequestAds: false };
    return lastConsentResult;
  }
  try {
    const info = await sdk.AdsConsent.requestInfoUpdate();
    if (
      info.status === sdk.AdsConsentStatus.REQUIRED ||
      info.status === sdk.AdsConsentStatus.UNKNOWN
    ) {
      const result = await sdk.AdsConsent.loadAndShowConsentFormIfRequired();
      lastConsentResult = {
        canRequestAds: result.status === sdk.AdsConsentStatus.OBTAINED,
      };
      return lastConsentResult;
    }
    lastConsentResult = { canRequestAds: true };
    return lastConsentResult;
  } catch {
    lastConsentResult = { canRequestAds: false };
    return lastConsentResult;
  }
}
