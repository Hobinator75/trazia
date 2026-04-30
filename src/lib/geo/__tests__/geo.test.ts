import { describe, expect, it } from 'vitest';

import {
  bezierPath,
  crossesAtlantic,
  crossesEquator,
  crossesPacific,
  crossesPolarCircle,
  greatCirclePath,
  haversineDistance,
  initialBearing,
  isAntipode,
  type LatLng,
} from '../index';

const FRA: LatLng = { latitude: 50.0379, longitude: 8.5622 };
const MUC: LatLng = { latitude: 48.3538, longitude: 11.7861 };
const JFK: LatLng = { latitude: 40.6413, longitude: -73.7781 };
const NRT: LatLng = { latitude: 35.7647, longitude: 140.3864 };
const LAX: LatLng = { latitude: 33.9416, longitude: -118.4085 };
const AKL: LatLng = { latitude: -37.0082, longitude: 174.7917 };
const MAD: LatLng = { latitude: 40.4936, longitude: -3.5668 };
const SCL: LatLng = { latitude: -33.393, longitude: -70.7858 };
const LHR: LatLng = { latitude: 51.47, longitude: -0.4543 };
const OSL: LatLng = { latitude: 60.1939, longitude: 11.1004 };
const LYR: LatLng = { latitude: 78.2461, longitude: 15.4656 };

describe('haversineDistance', () => {
  it('FRA-JFK is ~6204 km with <0.5% error vs the reference value', () => {
    const reference = 6204;
    const computed = haversineDistance(FRA, JFK);
    expect(Math.abs(computed - reference) / reference).toBeLessThan(0.005);
  });

  it('returns 0 for identical points', () => {
    expect(haversineDistance(FRA, FRA)).toBe(0);
  });

  it('FRA-MUC is ~300 km', () => {
    expect(haversineDistance(FRA, MUC)).toBeGreaterThan(290);
    expect(haversineDistance(FRA, MUC)).toBeLessThan(320);
  });
});

describe('initialBearing', () => {
  it('FRA-JFK heads roughly west-northwest (~285-295°)', () => {
    const bearing = initialBearing(FRA, JFK);
    expect(bearing).toBeGreaterThan(285);
    expect(bearing).toBeLessThan(300);
  });

  it('returns a value in [0, 360)', () => {
    const bearing = initialBearing(FRA, MUC);
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });
});

describe('crossesEquator', () => {
  it('SCL-FRA crosses the equator', () => {
    expect(crossesEquator(SCL, FRA)).toBe(true);
  });

  it('FRA-MUC does not cross', () => {
    expect(crossesEquator(FRA, MUC)).toBe(false);
  });

  it('JFK-LAX (both northern hemisphere) does not cross', () => {
    expect(crossesEquator(JFK, LAX)).toBe(false);
  });
});

describe('crossesAtlantic', () => {
  it('FRA-JFK is an Atlantic crossing', () => {
    expect(crossesAtlantic(FRA, JFK)).toBe(true);
  });

  it('FRA-MUC is not', () => {
    expect(crossesAtlantic(FRA, MUC)).toBe(false);
  });

  it('NRT-LAX is not (that is the Pacific)', () => {
    expect(crossesAtlantic(NRT, LAX)).toBe(false);
  });
});

describe('crossesPacific', () => {
  it('NRT-LAX crosses the Pacific (antimeridian)', () => {
    expect(crossesPacific(NRT, LAX)).toBe(true);
  });

  it('FRA-JFK does not', () => {
    expect(crossesPacific(FRA, JFK)).toBe(false);
  });
});

describe('crossesPolarCircle', () => {
  it('LHR-LYR crosses the northern polar circle', () => {
    const result = crossesPolarCircle(LHR, LYR);
    expect(result.north).toBe(true);
    expect(result.south).toBe(false);
  });

  it('LHR-OSL does not cross either circle', () => {
    const result = crossesPolarCircle(LHR, OSL);
    expect(result.north).toBe(false);
    expect(result.south).toBe(false);
  });

  it('FRA-MUC does not cross either circle', () => {
    const result = crossesPolarCircle(FRA, MUC);
    expect(result.north).toBe(false);
    expect(result.south).toBe(false);
  });
});

describe('isAntipode', () => {
  // Auckland and Madrid are *close* to antipodal but their literal antipode
  // distance is ~410 km, so the default 100 km tolerance is too tight here.
  // The function still validates correctly with a wider tolerance.
  it('AKL-MAD is approximately antipodal within ~500 km', () => {
    expect(isAntipode(AKL, MAD, 500)).toBe(true);
  });

  it('AKL-MAD is NOT antipodal within the default 100 km tolerance', () => {
    expect(isAntipode(AKL, MAD)).toBe(false);
  });

  it('FRA-MUC is nowhere near antipodal', () => {
    expect(isAntipode(FRA, MUC)).toBe(false);
  });

  it('respects the toleranceKm parameter', () => {
    expect(isAntipode(AKL, MAD, 1)).toBe(false);
    expect(isAntipode(AKL, MAD, 500)).toBe(true);
  });
});

describe('greatCirclePath', () => {
  it('returns the requested number of points', () => {
    const path = greatCirclePath(FRA, JFK, 64);
    expect(path).toHaveLength(64);
  });

  it('starts at a and ends at b (within numerical tolerance)', () => {
    const path = greatCirclePath(FRA, JFK, 32);
    expect(path[0]?.latitude).toBeCloseTo(FRA.latitude, 4);
    expect(path[0]?.longitude).toBeCloseTo(FRA.longitude, 4);
    const last = path[path.length - 1]!;
    expect(last.latitude).toBeCloseTo(JFK.latitude, 4);
    expect(last.longitude).toBeCloseTo(JFK.longitude, 4);
  });

  it('reaches a higher latitude than either endpoint on FRA-JFK', () => {
    const path = greatCirclePath(FRA, JFK, 64);
    const maxLat = Math.max(...path.map((p) => p.latitude));
    expect(maxLat).toBeGreaterThan(FRA.latitude);
  });
});

describe('bezierPath', () => {
  it('returns the requested number of points starting at a and ending at b', () => {
    const path = bezierPath(FRA, MUC, 0.2, 32);
    expect(path).toHaveLength(32);
    expect(path[0]?.latitude).toBeCloseTo(FRA.latitude, 6);
    expect(path[0]?.longitude).toBeCloseTo(FRA.longitude, 6);
    const last = path[path.length - 1]!;
    expect(last.latitude).toBeCloseTo(MUC.latitude, 6);
    expect(last.longitude).toBeCloseTo(MUC.longitude, 6);
  });

  it('is not collinear with a-b for non-zero curvature (some midpoint deflection)', () => {
    const straight = bezierPath(FRA, MUC, 0, 32);
    const curved = bezierPath(FRA, MUC, 0.5, 32);
    const sIdx = Math.floor(straight.length / 2);
    expect(
      Math.hypot(
        curved[sIdx]!.latitude - straight[sIdx]!.latitude,
        curved[sIdx]!.longitude - straight[sIdx]!.longitude,
      ),
    ).toBeGreaterThan(0.1);
  });
});
