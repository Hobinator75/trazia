import type { Journey } from '@/db/schema';

export interface AggregatedStats {
  totalJourneys: number;
  totalDistanceKm: number;
  byMode: Record<string, { count: number; distanceKm: number }>;
}

export function aggregateStats(journeys: Journey[]): AggregatedStats {
  const stats: AggregatedStats = {
    totalJourneys: journeys.length,
    totalDistanceKm: 0,
    byMode: {},
  };

  for (const journey of journeys) {
    const distance = journey.distanceKm ?? 0;
    stats.totalDistanceKm += distance;
    const bucket = stats.byMode[journey.mode] ?? { count: 0, distanceKm: 0 };
    bucket.count += 1;
    bucket.distanceKm += distance;
    stats.byMode[journey.mode] = bucket;
  }

  return stats;
}
