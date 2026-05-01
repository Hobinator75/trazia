import { Platform } from 'react-native';

// Google's published test ad unit IDs. Safe to ship — they always serve a
// "Test Ad" placeholder regardless of the calling app's AdMob account.
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
