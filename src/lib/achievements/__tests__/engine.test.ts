import { describe, expect, it } from 'vitest';

import type { Journey, Location, Operator, Vehicle } from '@/db/schema';

import { evaluateAll, evaluateOne } from '../engine';
import type { Achievement, AchievementContext } from '../types';

const baseJourney: Journey = {
  id: 'j-base',
  mode: 'flight',
  fromLocationId: 'loc-a',
  toLocationId: 'loc-b',
  date: '2026-04-15',
  startTimeLocal: null,
  endTimeLocal: null,
  startTimezone: null,
  endTimezone: null,
  operatorId: null,
  vehicleId: null,
  serviceNumber: null,
  cabinClass: null,
  seatNumber: null,
  parentJourneyId: null,
  distanceKm: 100,
  durationMinutes: 60,
  routeType: null,
  routePointsJson: null,
  notes: null,
  rating: null,
  weather: null,
  isManualEntry: true,
  source: 'manual',
  createdAt: new Date('2026-04-15T00:00:00Z'),
  updatedAt: new Date('2026-04-15T00:00:00Z'),
};

const j = (overrides: Partial<Journey>): Journey => ({ ...baseJourney, ...overrides });

const baseCtx = (
  journeys: Journey[],
  extra: Partial<AchievementContext> = {},
): AchievementContext => ({
  allJourneys: journeys,
  allUnlocks: [],
  ...extra,
});

const FRA: Pick<Location, 'id' | 'lat' | 'lng' | 'country'> = {
  id: 'loc-fra',
  lat: 50.0379,
  lng: 8.5622,
  country: 'DE',
};
const JFK = { id: 'loc-jfk', lat: 40.6413, lng: -73.7781, country: 'US' };
const NRT = { id: 'loc-nrt', lat: 35.7647, lng: 140.3864, country: 'JP' };
const LAX = { id: 'loc-lax', lat: 33.9416, lng: -118.4085, country: 'US' };
const SCL = { id: 'loc-scl', lat: -33.393, lng: -70.7858, country: 'CL' };
const LYR = { id: 'loc-lyr', lat: 78.2461, lng: 15.4656, country: 'NO' };
const AKL = { id: 'loc-akl', lat: -37.0082, lng: 174.7917, country: 'NZ' };
const MAD = { id: 'loc-mad', lat: 40.4936, lng: -3.5668, country: 'ES' };

const locationsMap = new Map<string, Location>(
  ([FRA, JFK, NRT, LAX, SCL, LYR, AKL, MAD] as const).map((loc) => [
    loc.id,
    {
      ...loc,
      name: loc.id,
      city: null,
      type: 'airport',
      iata: null,
      icao: null,
      ibnr: null,
      unlocode: null,
      isSystemSeed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
);

const vehiclesMap = new Map<string, Vehicle>([
  [
    'v-widebody',
    {
      id: 'v-widebody',
      mode: 'flight',
      code: 'B77W',
      category: 'widebody',
      manufacturer: 'Boeing',
      model: '777-300ER',
      capacity: 396,
      isSystemSeed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
]);

const operatorsMap = new Map<string, Operator>([
  [
    'op-lh',
    {
      id: 'op-lh',
      name: 'Lufthansa',
      code: 'LH',
      modes: ['flight'],
      country: 'DE',
      logoPath: null,
      isSystemSeed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    'op-ua',
    {
      id: 'op-ua',
      name: 'United',
      code: 'UA',
      modes: ['flight'],
      country: 'US',
      logoPath: null,
      isSystemSeed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
]);

describe('rule evaluators', () => {
  it('count: triggers on threshold reached, not before', () => {
    const a: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'count', threshold: 3 },
    };
    expect(evaluateOne(a, baseCtx([j({}), j({})]))).toBe(false);
    expect(evaluateOne(a, baseCtx([j({}), j({}), j({})]))).toBe(true);
  });

  it('distance_total: sums distance and respects mode filter', () => {
    const a: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'distance_total', thresholdKm: 1000, mode: 'flight' },
    };
    expect(
      evaluateOne(
        a,
        baseCtx([j({ mode: 'flight', distanceKm: 500 }), j({ mode: 'train', distanceKm: 600 })]),
      ),
    ).toBe(false);
    expect(
      evaluateOne(
        a,
        baseCtx([j({ mode: 'flight', distanceKm: 500 }), j({ mode: 'flight', distanceKm: 700 })]),
      ),
    ).toBe(true);
  });

  it('single_journey_distance: requires one journey at or above threshold', () => {
    const a: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'single_journey_distance', thresholdKm: 8000 },
    };
    expect(evaluateOne(a, baseCtx([j({ distanceKm: 5000 }), j({ distanceKm: 6000 })]))).toBe(false);
    expect(evaluateOne(a, baseCtx([j({ distanceKm: 5000 }), j({ distanceKm: 8200 })]))).toBe(true);
  });

  it('single_journey_duration: requires one journey at or above threshold', () => {
    const a: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'single_journey_duration', thresholdMinutes: 720 },
    };
    expect(evaluateOne(a, baseCtx([j({ durationMinutes: 600 })]))).toBe(false);
    expect(evaluateOne(a, baseCtx([j({ durationMinutes: 720 })]))).toBe(true);
  });

  it('geo_condition: matches Atlantic / equator / polar / antipode and skips when none', () => {
    const atlantic: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'geo_condition', condition: 'atlantic' },
    };
    const ctxFra = baseCtx([j({ fromLocationId: FRA.id, toLocationId: JFK.id })], {
      locationsById: locationsMap,
    });
    const ctxNrt = baseCtx([j({ fromLocationId: NRT.id, toLocationId: LAX.id })], {
      locationsById: locationsMap,
    });
    expect(evaluateOne(atlantic, ctxFra)).toBe(true);
    expect(evaluateOne(atlantic, ctxNrt)).toBe(false);

    const equator: Achievement = {
      ...atlantic,
      rule: { type: 'geo_condition', condition: 'equator' },
    };
    expect(
      evaluateOne(
        equator,
        baseCtx([j({ fromLocationId: SCL.id, toLocationId: FRA.id })], {
          locationsById: locationsMap,
        }),
      ),
    ).toBe(true);
    expect(evaluateOne(equator, ctxFra)).toBe(false);

    const polarNorth: Achievement = {
      ...atlantic,
      rule: { type: 'geo_condition', condition: 'polar_north' },
    };
    expect(
      evaluateOne(
        polarNorth,
        baseCtx([j({ fromLocationId: FRA.id, toLocationId: LYR.id })], {
          locationsById: locationsMap,
        }),
      ),
    ).toBe(true);

    const antipode: Achievement = {
      ...atlantic,
      rule: { type: 'geo_condition', condition: 'antipode', antipodeToleranceKm: 500 },
    };
    expect(
      evaluateOne(
        antipode,
        baseCtx([j({ fromLocationId: AKL.id, toLocationId: MAD.id })], {
          locationsById: locationsMap,
        }),
      ),
    ).toBe(true);
  });

  it('date_match: ISO date and --MM-DD pattern', () => {
    const onDate: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'date_match', pattern: '2026-04-15' },
    };
    expect(evaluateOne(onDate, baseCtx([j({ date: '2026-04-15' })]))).toBe(true);
    expect(evaluateOne(onDate, baseCtx([j({ date: '2026-04-16' })]))).toBe(false);

    const birthday: Achievement = {
      ...onDate,
      rule: { type: 'date_match', pattern: '--01-15' },
    };
    expect(evaluateOne(birthday, baseCtx([j({ date: '2024-01-15' })]))).toBe(true);
    expect(evaluateOne(birthday, baseCtx([j({ date: '2024-01-16' })]))).toBe(false);
  });

  it('vehicle_category: matches when a journey uses a categorized vehicle', () => {
    const a: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'vehicle_category', categories: ['widebody'] },
    };
    expect(
      evaluateOne(a, baseCtx([j({ vehicleId: 'v-widebody' })], { vehiclesById: vehiclesMap })),
    ).toBe(true);
    expect(evaluateOne(a, baseCtx([j({ vehicleId: null })], { vehiclesById: vehiclesMap }))).toBe(
      false,
    );
  });

  it('operator_set: any vs all matching modes', () => {
    const any: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'operator_set', operatorCodes: ['LH', 'UA'] },
    };
    expect(
      evaluateOne(any, baseCtx([j({ operatorId: 'op-lh' })], { operatorsById: operatorsMap })),
    ).toBe(true);
    expect(
      evaluateOne(any, baseCtx([j({ operatorId: null })], { operatorsById: operatorsMap })),
    ).toBe(false);

    const all: Achievement = {
      ...any,
      rule: { type: 'operator_set', operatorCodes: ['LH', 'UA'], match: 'all' },
    };
    expect(
      evaluateOne(all, baseCtx([j({ operatorId: 'op-lh' })], { operatorsById: operatorsMap })),
    ).toBe(false);
    expect(
      evaluateOne(
        all,
        baseCtx([j({ operatorId: 'op-lh' }), j({ operatorId: 'op-ua' })], {
          operatorsById: operatorsMap,
        }),
      ),
    ).toBe(true);
  });

  it('route_repeat: counts identical from-to pairs', () => {
    const a: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'route_repeat', count: 3 },
    };
    const route = { fromLocationId: 'x', toLocationId: 'y' };
    expect(evaluateOne(a, baseCtx([j(route), j(route)]))).toBe(false);
    expect(evaluateOne(a, baseCtx([j(route), j(route), j(route)]))).toBe(true);
  });

  it('operator_loyalty: with and without operatorCode', () => {
    const generic: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'operator_loyalty', count: 3 },
    };
    expect(
      evaluateOne(generic, baseCtx([j({ operatorId: 'op-lh' }), j({ operatorId: 'op-lh' })])),
    ).toBe(false);
    expect(
      evaluateOne(
        generic,
        baseCtx([
          j({ operatorId: 'op-lh' }),
          j({ operatorId: 'op-lh' }),
          j({ operatorId: 'op-lh' }),
        ]),
      ),
    ).toBe(true);

    const specific: Achievement = {
      ...generic,
      rule: { type: 'operator_loyalty', count: 2, operatorCode: 'LH' },
    };
    expect(
      evaluateOne(
        specific,
        baseCtx([j({ operatorId: 'op-lh' }), j({ operatorId: 'op-ua' })], {
          operatorsById: operatorsMap,
        }),
      ),
    ).toBe(false);
    expect(
      evaluateOne(
        specific,
        baseCtx([j({ operatorId: 'op-lh' }), j({ operatorId: 'op-lh' })], {
          operatorsById: operatorsMap,
        }),
      ),
    ).toBe(true);
  });

  it('different_count: counts unique countries via location refs', () => {
    const a: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'different_count', entity: 'countries', count: 3 },
    };
    expect(
      evaluateOne(
        a,
        baseCtx([j({ fromLocationId: FRA.id, toLocationId: JFK.id })], {
          locationsById: locationsMap,
        }),
      ),
    ).toBe(false);
    expect(
      evaluateOne(
        a,
        baseCtx(
          [
            j({ fromLocationId: FRA.id, toLocationId: JFK.id }),
            j({ fromLocationId: JFK.id, toLocationId: NRT.id }),
          ],
          { locationsById: locationsMap },
        ),
      ),
    ).toBe(true);
  });

  it('time_window: rolling N-day window minimum', () => {
    const a: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'time_window', windowDays: 7, minJourneys: 3 },
    };
    expect(
      evaluateOne(
        a,
        baseCtx([j({ date: '2026-01-01' }), j({ date: '2026-01-15' }), j({ date: '2026-02-01' })]),
      ),
    ).toBe(false);
    expect(
      evaluateOne(
        a,
        baseCtx([j({ date: '2026-01-01' }), j({ date: '2026-01-03' }), j({ date: '2026-01-05' })]),
      ),
    ).toBe(true);
  });

  it('cabin_class: matches exact cabin', () => {
    const a: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'cabin_class', cabinClass: 'first' },
    };
    expect(evaluateOne(a, baseCtx([j({ cabinClass: 'business' })]))).toBe(false);
    expect(evaluateOne(a, baseCtx([j({ cabinClass: 'first' })]))).toBe(true);
  });

  it('season_complete: requires journeys in all four seasons', () => {
    const a: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'season_complete' },
    };
    expect(
      evaluateOne(
        a,
        baseCtx([j({ date: '2026-03-15' }), j({ date: '2026-07-15' }), j({ date: '2026-10-15' })]),
      ),
    ).toBe(false);
    expect(
      evaluateOne(
        a,
        baseCtx([
          j({ date: '2026-03-15' }),
          j({ date: '2026-07-15' }),
          j({ date: '2026-10-15' }),
          j({ date: '2026-12-15' }),
        ]),
      ),
    ).toBe(true);
  });

  it('month_complete: requires journeys in every month of a year', () => {
    const a: Achievement = {
      id: 'a',
      title: 't',
      description: 'd',
      rule: { type: 'month_complete', year: 2026 },
    };
    const elevenMonths = Array.from({ length: 11 }, (_, i) =>
      j({ date: `2026-${String(i + 1).padStart(2, '0')}-15` }),
    );
    expect(evaluateOne(a, baseCtx(elevenMonths))).toBe(false);

    const twelveMonths = Array.from({ length: 12 }, (_, i) =>
      j({ date: `2026-${String(i + 1).padStart(2, '0')}-15` }),
    );
    expect(evaluateOne(a, baseCtx(twelveMonths))).toBe(true);
  });
});

describe('evaluateAll', () => {
  it('returns only achievements that are not yet unlocked', () => {
    const achievements: Achievement[] = [
      { id: 'a', title: 't', description: 'd', rule: { type: 'count', threshold: 1 } },
      { id: 'b', title: 't', description: 'd', rule: { type: 'count', threshold: 5 } },
    ];
    const ctx = baseCtx([j({})], { allUnlocks: [] });
    const fresh = evaluateAll(ctx, achievements);
    expect(fresh.map((u) => u.achievementId)).toEqual(['a']);

    const ctx2 = baseCtx([j({})], {
      allUnlocks: [{ achievementId: 'a', unlockedAt: new Date() }],
    });
    const after = evaluateAll(ctx2, achievements);
    expect(after).toEqual([]);
  });

  it('still evaluates hidden achievements (UI hides them, the engine does not)', () => {
    const achievements: Achievement[] = [
      {
        id: 'secret',
        title: 'Secret',
        description: '???',
        hidden: true,
        rule: { type: 'count', threshold: 1 },
      },
    ];
    const newUnlocks = evaluateAll(baseCtx([j({})]), achievements);
    expect(newUnlocks).toHaveLength(1);
    expect(newUnlocks[0]?.achievementId).toBe('secret');
  });

  it('attaches triggeringJourneyId when provided in context', () => {
    const achievements: Achievement[] = [
      { id: 'a', title: 't', description: 'd', rule: { type: 'count', threshold: 1 } },
    ];
    const result = evaluateAll(
      baseCtx([j({ id: 'trigger' })], { triggeringJourneyId: 'trigger' }),
      achievements,
    );
    expect(result[0]?.triggeringJourneyId).toBe('trigger');
  });
});

describe('performance', () => {
  it('evaluates 1000 journeys × 80 achievements in < 100 ms', () => {
    const journeys = Array.from({ length: 1000 }, (_, i) =>
      j({
        id: `j${i}`,
        date: `2026-${String((i % 12) + 1).padStart(2, '0')}-15`,
        distanceKm: 100 + (i % 10) * 50,
        durationMinutes: 60 + (i % 12) * 10,
        operatorId: i % 3 === 0 ? 'op-lh' : 'op-ua',
        vehicleId: i % 5 === 0 ? 'v-widebody' : null,
        fromLocationId: i % 2 === 0 ? FRA.id : NRT.id,
        toLocationId: i % 2 === 0 ? JFK.id : LAX.id,
        cabinClass: i % 7 === 0 ? 'first' : 'economy',
      }),
    );
    const achievements: Achievement[] = Array.from({ length: 80 }, (_, i) => ({
      id: `a${i}`,
      title: 't',
      description: 'd',
      rule:
        i % 5 === 0
          ? { type: 'count', threshold: i * 2 }
          : i % 5 === 1
            ? { type: 'distance_total', thresholdKm: i * 100 }
            : i % 5 === 2
              ? { type: 'route_repeat', count: i }
              : i % 5 === 3
                ? { type: 'time_window', windowDays: 7, minJourneys: i }
                : { type: 'operator_loyalty', count: i },
    }));

    const ctx: AchievementContext = {
      allJourneys: journeys,
      allUnlocks: [],
      locationsById: locationsMap,
      operatorsById: operatorsMap,
      vehiclesById: vehiclesMap,
    };

    const start = performance.now();
    evaluateAll(ctx, achievements);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});

describe('mode isolation via appliesTo', () => {
  const flightFirstClass: Achievement = {
    id: 'first_class',
    title: 'First Class',
    description: 'Flight first class.',
    appliesTo: 'flight',
    rule: { type: 'cabin_class', cabinClass: 'first' },
  };
  const railFirstClass: Achievement = {
    id: 'first_class_rail',
    title: 'First Class Rail',
    description: 'Train first class.',
    appliesTo: 'train',
    rule: { type: 'cabin_class', cabinClass: 'first' },
  };
  const dbLoyaltyFlight: Achievement = {
    id: 'brit_air_loyalty',
    title: 'Brit Air loyalty',
    description: 'Operator code DB (Brit Air, flight).',
    appliesTo: 'flight',
    rule: { type: 'operator_loyalty', count: 2, operatorCode: 'DB' },
  };
  const dbLoyaltyTrain: Achievement = {
    id: 'db_loyalty_25',
    title: 'BahnCard Hero',
    description: 'Operator code DB (Deutsche Bahn, train).',
    appliesTo: 'train',
    rule: { type: 'operator_loyalty', count: 2, operatorCode: 'DB' },
  };
  const transatlantic: Achievement = {
    id: 'transatlantic',
    title: 'Transatlantic',
    description: 'A flight that crosses the Atlantic.',
    appliesTo: 'flight',
    rule: { type: 'geo_condition', condition: 'atlantic' },
  };
  const multimodeCross: Achievement = {
    id: 'multimode_3',
    title: 'Multimode',
    description: 'Three different transport modes.',
    appliesTo: 'cross',
    rule: { type: 'count', threshold: 3 },
  };

  it('Train cabin=first does NOT trigger Flight first_class', () => {
    const ctx = baseCtx([j({ mode: 'train', cabinClass: 'first' })]);
    const unlocks = evaluateAll(ctx, [flightFirstClass, railFirstClass]);
    const ids = unlocks.map((u) => u.achievementId);
    expect(ids).not.toContain('first_class');
    expect(ids).toContain('first_class_rail');
  });

  it('Flight cabin=first does NOT trigger Train first_class_rail', () => {
    const ctx = baseCtx([j({ mode: 'flight', cabinClass: 'first' })]);
    const unlocks = evaluateAll(ctx, [flightFirstClass, railFirstClass]);
    const ids = unlocks.map((u) => u.achievementId);
    expect(ids).toContain('first_class');
    expect(ids).not.toContain('first_class_rail');
  });

  it('"DB" operator code is mode-isolated: train DB does not unlock flight DB loyalty', () => {
    const operators = new Map<string, Operator>([
      [
        'op-db-air',
        {
          id: 'op-db-air',
          name: 'Brit Air',
          code: 'DB',
          modes: ['flight'],
          country: 'GB',
          logoPath: null,
          isSystemSeed: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      [
        'op-db-rail',
        {
          id: 'op-db-rail',
          name: 'Deutsche Bahn',
          code: 'DB',
          modes: ['train'],
          country: 'DE',
          logoPath: null,
          isSystemSeed: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);
    const ctx = baseCtx(
      [
        j({ id: 'j1', mode: 'train', operatorId: 'op-db-rail' }),
        j({ id: 'j2', mode: 'train', operatorId: 'op-db-rail' }),
      ],
      { operatorsById: operators },
    );
    const unlocks = evaluateAll(ctx, [dbLoyaltyFlight, dbLoyaltyTrain]);
    const ids = unlocks.map((u) => u.achievementId);
    expect(ids).not.toContain('brit_air_loyalty');
    expect(ids).toContain('db_loyalty_25');
  });

  it('transatlantic (mode=flight) is not triggered by a ship with the same coordinates', () => {
    const ctx = baseCtx(
      [j({ mode: 'ship' as const, fromLocationId: FRA.id, toLocationId: JFK.id })],
      { locationsById: locationsMap },
    );
    const unlocks = evaluateAll(ctx, [transatlantic]);
    expect(unlocks.map((u) => u.achievementId)).not.toContain('transatlantic');
  });

  it('cross-mode achievement (multimode) still counts journeys across modes', () => {
    const ctx = baseCtx([
      j({ id: 'j1', mode: 'flight' }),
      j({ id: 'j2', mode: 'train' }),
      j({ id: 'j3', mode: 'ship' as const }),
    ]);
    const unlocks = evaluateAll(ctx, [multimodeCross]);
    expect(unlocks.map((u) => u.achievementId)).toContain('multimode_3');
  });
});
