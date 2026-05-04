import { describe, expect, it } from 'vitest';

import catalog from '../../../../docs/achievements.json';
import type { Achievement, RuleType } from '../types';

const ENGINE_RULE_TYPES: RuleType[] = [
  'count',
  'distance_total',
  'single_journey_distance',
  'single_journey_duration',
  'geo_condition',
  'date_match',
  'vehicle_category',
  'operator_set',
  'route_repeat',
  'operator_loyalty',
  'different_count',
  'time_window',
  'cabin_class',
  'season_complete',
  'month_complete',
];

const ALL = catalog as Achievement[];

describe('achievements catalog (docs/achievements.json)', () => {
  it('has unique IDs', () => {
    const ids = ALL.map((a) => a.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it('uses only rule.types that the engine implements', () => {
    const supported = new Set<RuleType>(ENGINE_RULE_TYPES);
    const unknown = ALL.filter((a) => !supported.has(a.rule.type as RuleType)).map((a) => ({
      id: a.id,
      type: a.rule.type,
    }));
    expect(unknown).toEqual([]);
  });

  it('exercises every engine rule.type at least once (smoke coverage)', () => {
    const present = new Set<RuleType>(ALL.map((a) => a.rule.type));
    const missing = ENGINE_RULE_TYPES.filter((t) => !present.has(t));
    expect(missing).toEqual([]);
  });

  it('contains at least 32 flight-mode achievements (Phase 1 spec)', () => {
    const flightCount = ALL.filter((a) => a.appliesTo === 'flight').length;
    expect(flightCount).toBeGreaterThanOrEqual(32);
  });

  it('contains at least 18 train-mode achievements (Phase 8.1 spec)', () => {
    const trainCount = ALL.filter((a) => a.appliesTo === 'train').length;
    expect(trainCount).toBeGreaterThanOrEqual(18);
  });

  it('exposes the spec-canonical first_train id', () => {
    expect(ALL.find((a) => a.id === 'first_train')).toBeDefined();
  });

  it('contains the IDs the manual test script and audit reference', () => {
    const required = [
      'first_flight',
      'first_journey',
      'transatlantic',
      'long_haul',
      'long_haul_8000',
      'jumbo_jet',
      'widebody',
    ];
    for (const id of required) {
      expect(
        ALL.find((a) => a.id === id),
        `achievement ${id} missing`,
      ).toBeDefined();
    }
  });

  it('does not still expose the renamed atlantic_crosser id', () => {
    expect(ALL.find((a) => a.id === 'atlantic_crosser')).toBeUndefined();
  });

  it('hidden achievements are tagged with hidden=true', () => {
    const hiddenCategoryNotFlagged = ALL.filter((a) => a.category === 'hidden' && !a.hidden);
    expect(hiddenCategoryNotFlagged).toEqual([]);
  });

  it('every achievement has a tier', () => {
    const noTier = ALL.filter((a) => !a.tier).map((a) => a.id);
    expect(noTier).toEqual([]);
  });

  // Mode-isolation invariant: the engine filters journeys by
  // achievement.appliesTo before evaluating the rule. To keep the
  // isolation reliable, every achievement MUST set appliesTo (either
  // 'cross' or a specific TransportMode) — otherwise a flight first-
  // class achievement could be triggered by a train cabin=first row
  // (the bug Codex Cross-Audit v2 surfaced).
  it('every achievement declares an appliesTo scope', () => {
    const missing = ALL.filter((a) => a.appliesTo === undefined).map((a) => ({
      id: a.id,
      type: a.rule.type,
    }));
    expect(missing).toEqual([]);
  });

  it('mode-sensitive rule types are scoped to a single TransportMode (or explicitly cross)', () => {
    const modeSensitive = new Set<RuleType>([
      'cabin_class',
      'vehicle_category',
      'operator_set',
      'operator_loyalty',
      'geo_condition',
      'route_repeat',
    ]);
    const offenders = ALL.filter(
      (a) => modeSensitive.has(a.rule.type) && a.appliesTo === undefined,
    ).map((a) => ({ id: a.id, type: a.rule.type }));
    expect(offenders).toEqual([]);
  });
});
