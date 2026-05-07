import { describe, expect, it } from 'vitest';

import { latLngToVec3 } from '../sphere';

const EPS = 1e-9;

const expectClose = (a: number, b: number, eps = EPS) => {
  expect(Math.abs(a - b)).toBeLessThan(eps);
};

describe('latLngToVec3', () => {
  it('places (0,0) on +X for radius 1', () => {
    const v = latLngToVec3(0, 0);
    expectClose(v.x, 1);
    expectClose(v.y, 0);
    expectClose(v.z, 0);
  });

  it('places the north pole on +Y', () => {
    const v = latLngToVec3(90, 0);
    expectClose(v.x, 0);
    expectClose(v.y, 1);
    expectClose(v.z, 0);
  });

  it('places the south pole on -Y', () => {
    const v = latLngToVec3(-90, 0);
    expectClose(v.x, 0);
    expectClose(v.y, -1);
    expectClose(v.z, 0);
  });

  it('places (0,90) on -Z', () => {
    const v = latLngToVec3(0, 90);
    expectClose(v.x, 0);
    expectClose(v.y, 0);
    expectClose(v.z, -1);
  });

  it('places (0,180) on -X (antimeridian)', () => {
    const v = latLngToVec3(0, 180);
    expectClose(v.x, -1);
    expectClose(v.y, 0);
    expectClose(v.z, 0);
  });

  it('places (0,-180) on -X (other side of antimeridian)', () => {
    const v = latLngToVec3(0, -180);
    expectClose(v.x, -1);
    expectClose(v.y, 0);
    expectClose(v.z, 0);
  });

  it('scales linearly with radius', () => {
    const v1 = latLngToVec3(45, 30);
    const v2 = latLngToVec3(45, 30, 5);
    expectClose(v2.x, v1.x * 5);
    expectClose(v2.y, v1.y * 5);
    expectClose(v2.z, v1.z * 5);
  });

  it('keeps every output on the requested sphere', () => {
    const samples: [number, number][] = [
      [0, 0],
      [50.0379, 8.5622], // FRA
      [40.6413, -73.7781], // JFK
      [35.7647, 140.3864], // NRT
      [-37.0082, 174.7917], // AKL
      [78.2461, 15.4656], // LYR
      [-90, 0],
      [0, -180],
    ];
    for (const [lat, lng] of samples) {
      const v = latLngToVec3(lat, lng, 2.5);
      const r = Math.hypot(v.x, v.y, v.z);
      expectClose(r, 2.5, 1e-7);
    }
  });
});
