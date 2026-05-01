import { usePremiumStore } from '@/stores/premiumStore';

import type { IapAdapter, OfferingsView, ProductId, PurchaseResult } from './types';

const MOCK_OFFERINGS: OfferingsView = {
  monthly: {
    id: 'trazia_premium_monthly',
    title: 'Trazia Premium · monatlich',
    priceLabel: '4,99 €',
    pricePerMonthLabel: '4,99 € / Monat',
    bullets: ['Unbegrenzt Fotos pro Reise', 'Premium-Achievements + Wrapped-Story', 'Werbefrei'],
  },
  yearly: {
    id: 'trazia_premium_yearly',
    title: 'Trazia Premium · jährlich',
    priceLabel: '29,99 €',
    pricePerMonthLabel: '≈ 2,49 € / Monat',
    introTrialDays: 7,
    bullets: [
      '7 Tage kostenlos testen',
      'Alle Premium-Features',
      'Cloud-Sync (in Phase 6)',
      'Werbefrei',
    ],
  },
};

export const mockIap: IapAdapter = {
  async configure() {
    usePremiumStore.getState().setHydrating(false);
  },

  async refreshCustomerInfo() {
    // No-op; mock store is the source of truth.
  },

  async getOfferings(): Promise<OfferingsView> {
    return MOCK_OFFERINGS;
  },

  async purchase(_packageId: ProductId): Promise<PurchaseResult> {
    usePremiumStore.getState().setIsPremium(true);
    return { success: true };
  },

  async restore(): Promise<PurchaseResult> {
    // Mock restore is a no-op success — flip flag if previously set.
    return { success: usePremiumStore.getState().isPremium };
  },

  setMockPremium(value) {
    usePremiumStore.getState().setIsPremium(value);
  },
};
