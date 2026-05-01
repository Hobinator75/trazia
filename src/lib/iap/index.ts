import { Platform } from 'react-native';

import { mockIap } from './mock';
import { revenueCat } from './revenuecat';
import type { IapAdapter, OfferingsView, ProductId, PurchaseResult } from './types';

export type { IapAdapter, IapPackage, OfferingsView, ProductId, PurchaseResult } from './types';

const hasRealApiKey = (): boolean => {
  if (Platform.OS === 'ios') return Boolean(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS);
  if (Platform.OS === 'android') return Boolean(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID);
  return false;
};

let activeAdapter: IapAdapter = mockIap;
let configured = false;

export const isMockIap = (): boolean => activeAdapter === mockIap;

export async function configureIap(): Promise<void> {
  if (configured) return;
  configured = true;
  if (hasRealApiKey()) {
    try {
      await revenueCat.configure();
      activeAdapter = revenueCat;
      return;
    } catch {
      // Fall through to mock.
    }
  }
  await mockIap.configure();
  activeAdapter = mockIap;
}

export const refreshCustomerInfo = (): Promise<void> => activeAdapter.refreshCustomerInfo();
export const getOfferings = (): Promise<OfferingsView> => activeAdapter.getOfferings();
export const purchasePackage = (id: ProductId): Promise<PurchaseResult> =>
  activeAdapter.purchase(id);
export const restorePurchases = (): Promise<PurchaseResult> => activeAdapter.restore();

// Test/dev helper. Only does anything when the mock adapter is active.
export const setMockPremium = (value: boolean): void => {
  activeAdapter.setMockPremium?.(value);
};
