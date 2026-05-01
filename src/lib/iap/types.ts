export type ProductId = 'trazia_premium_monthly' | 'trazia_premium_yearly';

export interface IapPackage {
  id: ProductId;
  // Display copy. The IAP backends provide localised strings; the mock
  // implementation hard-codes German/Euro for dev parity.
  title: string;
  priceLabel: string;
  pricePerMonthLabel?: string;
  introTrialDays?: number;
  bullets: string[];
}

export interface OfferingsView {
  monthly?: IapPackage;
  yearly?: IapPackage;
}

export interface PurchaseResult {
  success: boolean;
  cancelled?: boolean;
  error?: string;
}

export interface IapAdapter {
  configure(): Promise<void>;
  refreshCustomerInfo(): Promise<void>;
  getOfferings(): Promise<OfferingsView>;
  purchase(packageId: ProductId): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
  // Mock-only. The real adapter throws.
  setMockPremium?(value: boolean): void;
}
