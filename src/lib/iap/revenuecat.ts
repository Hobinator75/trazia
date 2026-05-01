import { Platform } from 'react-native';

import { usePremiumStore } from '@/stores/premiumStore';

import type { IapAdapter, IapPackage, OfferingsView, ProductId, PurchaseResult } from './types';

// react-native-purchases is loaded lazily so the mock fallback can boot
// even if the native module isn't installed (Expo Go, web preview, jest).
type Purchases = typeof import('react-native-purchases').default;

const PREMIUM_ENTITLEMENT = 'premium';

let cached: Purchases | null = null;

async function loadPurchases(): Promise<Purchases | null> {
  if (cached) return cached;
  try {
    const mod = await import('react-native-purchases');
    cached = mod.default;
    return cached;
  } catch {
    return null;
  }
}

const apiKey = (): string | undefined => {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  return undefined;
};

const mapPackage = (pkg: {
  identifier: string;
  product: { priceString: string; introPrice?: { periodNumberOfUnits: number } | null };
}): IapPackage | null => {
  const id = pkg.identifier as ProductId;
  if (id !== 'trazia_premium_monthly' && id !== 'trazia_premium_yearly') return null;
  const isYearly = id === 'trazia_premium_yearly';
  return {
    id,
    title: isYearly ? 'Trazia Premium · jährlich' : 'Trazia Premium · monatlich',
    priceLabel: pkg.product.priceString,
    ...(isYearly && pkg.product.introPrice?.periodNumberOfUnits
      ? { introTrialDays: pkg.product.introPrice.periodNumberOfUnits }
      : {}),
    bullets: isYearly
      ? ['7 Tage kostenlos testen', 'Alle Premium-Features', 'Cloud-Sync (in Phase 6)', 'Werbefrei']
      : ['Unbegrenzt Fotos pro Reise', 'Premium-Achievements + Wrapped-Story', 'Werbefrei'],
  };
};

export const revenueCat: IapAdapter = {
  async configure() {
    const Purchases = await loadPurchases();
    const key = apiKey();
    if (!Purchases || !key) {
      // Stay in hydrating=false but isPremium=false; the IAP module will
      // pick the mock adapter instead.
      usePremiumStore.getState().setHydrating(false);
      throw new Error('RevenueCat unavailable (missing native module or API key)');
    }
    Purchases.configure({ apiKey: key });
    Purchases.addCustomerInfoUpdateListener((info) => {
      const active = Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT]);
      usePremiumStore.getState().setIsPremium(active);
    });
    await this.refreshCustomerInfo();
  },

  async refreshCustomerInfo() {
    const Purchases = await loadPurchases();
    if (!Purchases) return;
    try {
      const info = await Purchases.getCustomerInfo();
      const active = Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT]);
      usePremiumStore.getState().setIsPremium(active);
    } finally {
      usePremiumStore.getState().setHydrating(false);
    }
  },

  async getOfferings(): Promise<OfferingsView> {
    const Purchases = await loadPurchases();
    if (!Purchases) return {};
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return {};
    const mapped: OfferingsView = {};
    for (const pkg of current.availablePackages) {
      const view = mapPackage(pkg);
      if (!view) continue;
      if (view.id === 'trazia_premium_monthly') mapped.monthly = view;
      if (view.id === 'trazia_premium_yearly') mapped.yearly = view;
    }
    return mapped;
  },

  async purchase(packageId: ProductId): Promise<PurchaseResult> {
    const Purchases = await loadPurchases();
    if (!Purchases) return { success: false, error: 'IAP nicht verfügbar' };
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      const pkg = current?.availablePackages.find((p) => p.identifier === packageId);
      if (!pkg) return { success: false, error: 'Produkt nicht verfügbar' };
      const result = await Purchases.purchasePackage(pkg);
      const active = Boolean(result.customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]);
      usePremiumStore.getState().setIsPremium(active);
      return { success: active };
    } catch (e) {
      // RevenueCat throws { userCancelled: true } when the sheet is dismissed.
      const cancelled = (e as { userCancelled?: boolean }).userCancelled === true;
      return {
        success: false,
        cancelled,
        error: cancelled ? undefined : e instanceof Error ? e.message : String(e),
      };
    }
  },

  async restore(): Promise<PurchaseResult> {
    const Purchases = await loadPurchases();
    if (!Purchases) return { success: false, error: 'IAP nicht verfügbar' };
    try {
      const info = await Purchases.restorePurchases();
      const active = Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT]);
      usePremiumStore.getState().setIsPremium(active);
      return { success: active };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
