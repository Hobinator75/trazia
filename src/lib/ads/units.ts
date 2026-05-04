import { Platform } from 'react-native';

// Production AdMob unit IDs are baked into the binary — there is no env-var
// override path. Publisher: pub-6316860881127013 (Tim Hobrlant). Slots that
// Trazia does not currently render (banner, app-open) resolve to `null`;
// callers must short-circuit on null instead of passing it to the SDK.
//
// Dev / preview / Expo-Go / vitest builds resolve to Google's published
// test units instead, which always serve a "Test Ad" placeholder. The
// switch is `EXPO_PUBLIC_ENV === 'production'` (eas.json sets this for
// production builds only).

const PROD_NATIVE_IOS = 'ca-app-pub-6316860881127013/5488275799';
const PROD_INTERSTITIAL_IOS = 'ca-app-pub-6316860881127013/6284376351';
const PROD_REWARDED_IOS = 'ca-app-pub-6316860881127013/4971294683';

const PROD_NATIVE_ANDROID = 'ca-app-pub-6316860881127013/4508260252';
const PROD_INTERSTITIAL_ANDROID = 'ca-app-pub-6316860881127013/4839432748';
const PROD_REWARDED_ANDROID = 'ca-app-pub-6316860881127013/7405886336';

const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716';
const TEST_INTERSTITIAL_ANDROID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_INTERSTITIAL_IOS = 'ca-app-pub-3940256099942544/4411468910';
const TEST_REWARDED_ANDROID = 'ca-app-pub-3940256099942544/5224354917';
const TEST_REWARDED_IOS = 'ca-app-pub-3940256099942544/1712485313';
const TEST_NATIVE_ANDROID = 'ca-app-pub-3940256099942544/2247696110';
const TEST_NATIVE_IOS = 'ca-app-pub-3940256099942544/3986624511';

const isProductionBuild = (): boolean => process.env.EXPO_PUBLIC_ENV === 'production';

const SENTINEL_RE = /^(REPLACE_WITH_|XXXXX|TODO|placeholder)/i;

const requireRealUnit = (slot: string, value: string): string => {
  if (!value || value.length === 0 || SENTINEL_RE.test(value)) {
    throw new Error(
      `[ads] Production build requires real AdMob unit IDs but ${slot} is unset or a sentinel ` +
        `("${value}"). Update src/lib/ads/units.ts before shipping.`,
    );
  }
  return value;
};

interface AdUnits {
  // Slots actively rendered today.
  native: string | null;
  interstitial: string | null;
  rewarded: string | null;
  // Reserved slots — never read by the current UI. Production IDs are
  // intentionally `null`; consumers must short-circuit.
  banner: string | null;
  appOpen: string | null;
}

const buildProdUnits = (): AdUnits => {
  if (Platform.OS === 'ios') {
    return {
      native: requireRealUnit('native (ios)', PROD_NATIVE_IOS),
      interstitial: requireRealUnit('interstitial (ios)', PROD_INTERSTITIAL_IOS),
      rewarded: requireRealUnit('rewarded (ios)', PROD_REWARDED_IOS),
      banner: null,
      appOpen: null,
    };
  }
  return {
    native: requireRealUnit('native (android)', PROD_NATIVE_ANDROID),
    interstitial: requireRealUnit('interstitial (android)', PROD_INTERSTITIAL_ANDROID),
    rewarded: requireRealUnit('rewarded (android)', PROD_REWARDED_ANDROID),
    banner: null,
    appOpen: null,
  };
};

const buildTestUnits = (): AdUnits => {
  const ios = Platform.OS === 'ios';
  return {
    native: ios ? TEST_NATIVE_IOS : TEST_NATIVE_ANDROID,
    interstitial: ios ? TEST_INTERSTITIAL_IOS : TEST_INTERSTITIAL_ANDROID,
    rewarded: ios ? TEST_REWARDED_IOS : TEST_REWARDED_ANDROID,
    banner: ios ? TEST_BANNER_IOS : TEST_BANNER_ANDROID,
    appOpen: null,
  };
};

export const adUnits: AdUnits = isProductionBuild() ? buildProdUnits() : buildTestUnits();

export const isUsingTestUnits = !isProductionBuild();

// Frequency-cap config. Centralised so the controllers and any future
// dashboards reference the same numbers.
export const adFrequency = {
  interstitialEveryNthInsert: 5,
  interstitialMinIntervalMs: 90 * 1000,
  nativeEveryNthRow: 10,
  newInstallGraceMs: 60 * 1000,
  rewardedTrialDays: 7,
  rewardedTrialItem: 'Trazia Pro days',
  rewardedTrialAntiAbuseWindowMs: 30 * 24 * 60 * 60 * 1000,
} as const;
