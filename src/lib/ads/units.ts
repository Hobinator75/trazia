import { Platform } from 'react-native';

// BEFORE PRODUCTION BUILD: replace the AdMob test fallbacks with real
// IDs from the production AdMob account, set via EAS Secrets. The
// constants below are Google's published test units — they always
// serve a "Test Ad" placeholder. Shipping a Production build with
// these still active means zero ad revenue.
//
// Required EAS Secrets:
//   EXPO_PUBLIC_ADMOB_BANNER_{ANDROID,IOS}
//   EXPO_PUBLIC_ADMOB_INTERSTITIAL_{ANDROID,IOS}
//   EXPO_PUBLIC_ADMOB_REWARDED_{ANDROID,IOS}
// AND: app.json plugins.react-native-google-mobile-ads.{android,ios}AppId
//      → real ca-app-pub-XXXX~YYYY values.
//
// See RELEASE_CHECKLIST.md → "Hard-Stops vor erstem Production-Build".
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716';
const TEST_INTERSTITIAL_ANDROID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_INTERSTITIAL_IOS = 'ca-app-pub-3940256099942544/4411468910';
const TEST_REWARDED_ANDROID = 'ca-app-pub-3940256099942544/5224354917';
const TEST_REWARDED_IOS = 'ca-app-pub-3940256099942544/1712485313';

const pickFromEnv = (
  android: string | undefined,
  ios: string | undefined,
  fallbackAndroid: string,
  fallbackIos: string,
): string => {
  if (Platform.OS === 'android') return android && android.length > 0 ? android : fallbackAndroid;
  return ios && ios.length > 0 ? ios : fallbackIos;
};

export const adUnits = {
  banner: pickFromEnv(
    process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
    process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
    TEST_BANNER_ANDROID,
    TEST_BANNER_IOS,
  ),
  interstitial: pickFromEnv(
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID,
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS,
    TEST_INTERSTITIAL_ANDROID,
    TEST_INTERSTITIAL_IOS,
  ),
  rewarded: pickFromEnv(
    process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
    process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
    TEST_REWARDED_ANDROID,
    TEST_REWARDED_IOS,
  ),
};

export const isUsingTestUnits =
  !process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID &&
  !process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS &&
  !process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID &&
  !process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS;
