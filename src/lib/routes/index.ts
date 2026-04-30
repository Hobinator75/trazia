import { haversineDistanceKm, type LatLng } from '@/lib/geo';

export interface RouteSegment {
  from: LatLng;
  to: LatLng;
  distanceKm: number;
}

export function buildGreatCircleSegment(from: LatLng, to: LatLng): RouteSegment {
  return {
    from,
    to,
    distanceKm: haversineDistanceKm(from, to),
  };
}
