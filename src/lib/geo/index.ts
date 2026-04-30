export interface LatLng {
  latitude: number;
  longitude: number;
}

export const EARTH_RADIUS_KM = 6371.0088;
export const EARTH_CIRCUMFERENCE_KM = 40075.017;
export const POLAR_CIRCLE_LAT = 66.5;

const TWO_PI = Math.PI * 2;
const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

const normalizeLng = (lng: number): number => {
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
};

export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function initialBearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (((toDeg(Math.atan2(y, x)) + 360) % 360) + 360) % 360;
}

export function crossesEquator(a: LatLng, b: LatLng): boolean {
  return a.latitude * b.latitude < 0;
}

export function crossesAtlantic(a: LatLng, b: LatLng): boolean {
  // Heuristic per Konzept-Doku: longitude band [-50, 0] traversed with
  // endpoints on opposite sides (one strictly east of 0°, one strictly west
  // of -50°). If the shorter great-circle arc instead wraps around the
  // antimeridian, the path is over the Pacific, so we exclude that case.
  if (Math.abs(a.longitude - b.longitude) > 180) return false;
  const eastA = a.longitude > 0;
  const westA = a.longitude < -50;
  const eastB = b.longitude > 0;
  const westB = b.longitude < -50;
  return (eastA && westB) || (westA && eastB);
}

export function crossesPacific(a: LatLng, b: LatLng): boolean {
  // Shorter great-circle arc crosses the antimeridian (180° meridian).
  return Math.abs(a.longitude - b.longitude) > 180;
}

export function crossesPolarCircle(a: LatLng, b: LatLng): { north: boolean; south: boolean } {
  const path = greatCirclePath(a, b, 64);
  let north = false;
  let south = false;
  for (const point of path) {
    if (point.latitude >= POLAR_CIRCLE_LAT) north = true;
    if (point.latitude <= -POLAR_CIRCLE_LAT) south = true;
    if (north && south) break;
  }
  return { north, south };
}

export function isAntipode(a: LatLng, b: LatLng, toleranceKm = 100): boolean {
  const antipodeOfA: LatLng = {
    latitude: -a.latitude,
    longitude: normalizeLng(a.longitude + 180),
  };
  return haversineDistance(antipodeOfA, b) <= toleranceKm;
}

export function greatCirclePath(a: LatLng, b: LatLng, points = 64): LatLng[] {
  if (points <= 0) return [];

  const phi1 = toRad(a.latitude);
  const phi2 = toRad(b.latitude);
  const lam1 = toRad(a.longitude);
  const lam2 = toRad(b.longitude);

  const x1 = Math.cos(phi1) * Math.cos(lam1);
  const y1 = Math.cos(phi1) * Math.sin(lam1);
  const z1 = Math.sin(phi1);
  const x2 = Math.cos(phi2) * Math.cos(lam2);
  const y2 = Math.cos(phi2) * Math.sin(lam2);
  const z2 = Math.sin(phi2);

  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  const omega = Math.acos(dot);

  const out: LatLng[] = [];
  if (omega < 1e-10) {
    for (let i = 0; i < points; i++) {
      out.push({ latitude: a.latitude, longitude: a.longitude });
    }
    return out;
  }

  const sinOmega = Math.sin(omega);
  for (let i = 0; i < points; i++) {
    const t = points === 1 ? 0 : i / (points - 1);
    const f1 = Math.sin((1 - t) * omega) / sinOmega;
    const f2 = Math.sin(t * omega) / sinOmega;
    const x = f1 * x1 + f2 * x2;
    const y = f1 * y1 + f2 * y2;
    const z = f1 * z1 + f2 * z2;
    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    const lng = toDeg(Math.atan2(y, x));
    out.push({ latitude: lat, longitude: lng });
  }
  return out;
}

export function bezierPath(a: LatLng, b: LatLng, curvature = 0.2, points = 32): LatLng[] {
  if (points <= 0) return [];

  // Take the shorter longitudinal direction (handle dateline).
  let dLng = b.longitude - a.longitude;
  if (dLng > 180) dLng -= 360;
  if (dLng < -180) dLng += 360;
  const dLat = b.latitude - a.latitude;

  const length = Math.hypot(dLng, dLat);
  let perpLat = 0;
  let perpLng = 0;
  if (length > 1e-9) {
    perpLng = -dLat / length;
    perpLat = dLng / length;
  }

  const offset = length * curvature;
  const cp: LatLng = {
    latitude: a.latitude + dLat / 2 + perpLat * offset,
    longitude: a.longitude + dLng / 2 + perpLng * offset,
  };

  const out: LatLng[] = [];
  for (let i = 0; i < points; i++) {
    const t = points === 1 ? 0 : i / (points - 1);
    const omt = 1 - t;
    out.push({
      latitude: omt * omt * a.latitude + 2 * omt * t * cp.latitude + t * t * b.latitude,
      longitude: normalizeLng(
        omt * omt * a.longitude + 2 * omt * t * cp.longitude + t * t * b.longitude,
      ),
    });
  }
  return out;
}

// Suppress unused lint on TWO_PI if minifier optimizes out; it's exposed for
// downstream geo helpers (route smoothing, animation).
export { TWO_PI };
