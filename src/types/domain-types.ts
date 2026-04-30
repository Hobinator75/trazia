export type TransportMode = 'flight' | 'train' | 'car' | 'ship';

export type LocationKind = 'airport' | 'train_station' | 'port' | 'address';

export type OperatorKind = 'airline' | 'railway' | 'shipping' | 'rental';

export interface DistanceSummary {
  km: number;
  mi: number;
}

export interface DateRange {
  start: string;
  end: string;
}
