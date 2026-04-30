import type { Journey } from '@/db/schema';
import {
  crossesAtlantic,
  crossesEquator,
  crossesPacific,
  crossesPolarCircle,
  isAntipode,
  type LatLng,
} from '@/lib/geo';

import achievementsCatalog from '../../../docs/achievements.json';
import type {
  Achievement,
  AchievementContext,
  CabinClassRule,
  CountRule,
  DateMatchRule,
  DifferentCountRule,
  DistanceTotalRule,
  GeoConditionRule,
  MonthCompleteRule,
  OperatorLoyaltyRule,
  OperatorSetRule,
  RouteRepeatRule,
  Rule,
  SeasonCompleteRule,
  SingleJourneyDistanceRule,
  SingleJourneyDurationRule,
  TimeWindowRule,
  UnlockResult,
  VehicleCategoryRule,
} from './types';

let cachedAchievements: Achievement[] | null = null;

export function loadAchievements(): Achievement[] {
  if (cachedAchievements) return cachedAchievements;
  cachedAchievements = (achievementsCatalog as Achievement[]).slice();
  return cachedAchievements;
}

// Test hook: replace the cached catalog to inject deterministic data without
// touching the JSON file.
export function __setAchievementsCatalogForTesting(achievements: Achievement[] | null): void {
  cachedAchievements = achievements;
}

export function evaluateAll(
  ctx: AchievementContext,
  achievements: Achievement[] = loadAchievements(),
): UnlockResult[] {
  const unlockedIds = new Set(ctx.allUnlocks.map((u) => u.achievementId));
  const now = new Date().toISOString();
  const out: UnlockResult[] = [];

  for (const achievement of achievements) {
    if (unlockedIds.has(achievement.id)) continue;
    if (!evaluateOne(achievement, ctx)) continue;
    out.push({
      achievementId: achievement.id,
      unlockedAt: now,
      ...(ctx.triggeringJourneyId !== undefined
        ? { triggeringJourneyId: ctx.triggeringJourneyId }
        : {}),
    });
  }
  return out;
}

export function evaluateOne(achievement: Achievement, ctx: AchievementContext): boolean {
  return evaluateRule(achievement.rule, ctx);
}

function evaluateRule(rule: Rule, ctx: AchievementContext): boolean {
  switch (rule.type) {
    case 'count':
      return evalCount(rule, ctx);
    case 'distance_total':
      return evalDistanceTotal(rule, ctx);
    case 'single_journey_distance':
      return evalSingleJourneyDistance(rule, ctx);
    case 'single_journey_duration':
      return evalSingleJourneyDuration(rule, ctx);
    case 'geo_condition':
      return evalGeoCondition(rule, ctx);
    case 'date_match':
      return evalDateMatch(rule, ctx);
    case 'vehicle_category':
      return evalVehicleCategory(rule, ctx);
    case 'operator_set':
      return evalOperatorSet(rule, ctx);
    case 'route_repeat':
      return evalRouteRepeat(rule, ctx);
    case 'operator_loyalty':
      return evalOperatorLoyalty(rule, ctx);
    case 'different_count':
      return evalDifferentCount(rule, ctx);
    case 'time_window':
      return evalTimeWindow(rule, ctx);
    case 'cabin_class':
      return evalCabinClass(rule, ctx);
    case 'season_complete':
      return evalSeasonComplete(rule, ctx);
    case 'month_complete':
      return evalMonthComplete(rule, ctx);
  }
}

const filterByMode = (journeys: Journey[], mode?: string): Journey[] =>
  mode ? journeys.filter((j) => j.mode === mode) : journeys;

function evalCount(rule: CountRule, ctx: AchievementContext): boolean {
  return filterByMode(ctx.allJourneys, rule.mode).length >= rule.threshold;
}

function evalDistanceTotal(rule: DistanceTotalRule, ctx: AchievementContext): boolean {
  let sum = 0;
  for (const j of filterByMode(ctx.allJourneys, rule.mode)) {
    sum += j.distanceKm ?? 0;
  }
  return sum >= rule.thresholdKm;
}

function evalSingleJourneyDistance(
  rule: SingleJourneyDistanceRule,
  ctx: AchievementContext,
): boolean {
  for (const j of filterByMode(ctx.allJourneys, rule.mode)) {
    if ((j.distanceKm ?? 0) >= rule.thresholdKm) return true;
  }
  return false;
}

function evalSingleJourneyDuration(
  rule: SingleJourneyDurationRule,
  ctx: AchievementContext,
): boolean {
  for (const j of filterByMode(ctx.allJourneys, rule.mode)) {
    if ((j.durationMinutes ?? 0) >= rule.thresholdMinutes) return true;
  }
  return false;
}

function evalGeoCondition(rule: GeoConditionRule, ctx: AchievementContext): boolean {
  if (!ctx.locationsById) return false;
  for (const j of ctx.allJourneys) {
    const from = ctx.locationsById.get(j.fromLocationId);
    const to = ctx.locationsById.get(j.toLocationId);
    if (!from || !to) continue;
    const a: LatLng = { latitude: from.lat, longitude: from.lng };
    const b: LatLng = { latitude: to.lat, longitude: to.lng };
    if (matchGeoCondition(rule, a, b)) return true;
  }
  return false;
}

function matchGeoCondition(rule: GeoConditionRule, a: LatLng, b: LatLng): boolean {
  switch (rule.condition) {
    case 'equator':
      return crossesEquator(a, b);
    case 'atlantic':
      return crossesAtlantic(a, b);
    case 'pacific':
      return crossesPacific(a, b);
    case 'polar_north':
      return crossesPolarCircle(a, b).north;
    case 'polar_south':
      return crossesPolarCircle(a, b).south;
    case 'antipode':
      return isAntipode(a, b, rule.antipodeToleranceKm ?? 100);
  }
}

function evalDateMatch(rule: DateMatchRule, ctx: AchievementContext): boolean {
  const isYearAgnostic = rule.pattern.startsWith('--');
  const target = isYearAgnostic ? rule.pattern.slice(2) : rule.pattern;
  for (const j of ctx.allJourneys) {
    if (!j.date) continue;
    if (isYearAgnostic) {
      if (j.date.endsWith(target)) return true;
    } else if (j.date === target) {
      return true;
    }
  }
  return false;
}

function evalVehicleCategory(rule: VehicleCategoryRule, ctx: AchievementContext): boolean {
  if (!ctx.vehiclesById || rule.categories.length === 0) return false;
  const wanted = new Set(rule.categories);
  for (const j of ctx.allJourneys) {
    if (!j.vehicleId) continue;
    const v = ctx.vehiclesById.get(j.vehicleId);
    if (v?.category && wanted.has(v.category)) return true;
  }
  return false;
}

function evalOperatorSet(rule: OperatorSetRule, ctx: AchievementContext): boolean {
  if (!ctx.operatorsById || rule.operatorCodes.length === 0) return false;
  const wanted = new Set(rule.operatorCodes);
  if (rule.match === 'all') {
    const seen = new Set<string>();
    for (const j of ctx.allJourneys) {
      if (!j.operatorId) continue;
      const op = ctx.operatorsById.get(j.operatorId);
      if (op?.code && wanted.has(op.code)) seen.add(op.code);
    }
    return rule.operatorCodes.every((code) => seen.has(code));
  }
  for (const j of ctx.allJourneys) {
    if (!j.operatorId) continue;
    const op = ctx.operatorsById.get(j.operatorId);
    if (op?.code && wanted.has(op.code)) return true;
  }
  return false;
}

function evalRouteRepeat(rule: RouteRepeatRule, ctx: AchievementContext): boolean {
  const counts = new Map<string, number>();
  for (const j of ctx.allJourneys) {
    const key = `${j.fromLocationId}>${j.toLocationId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const c of counts.values()) {
    if (c >= rule.count) return true;
  }
  return false;
}

function evalOperatorLoyalty(rule: OperatorLoyaltyRule, ctx: AchievementContext): boolean {
  if (rule.operatorCode) {
    if (!ctx.operatorsById) return false;
    let count = 0;
    for (const j of ctx.allJourneys) {
      if (!j.operatorId) continue;
      const op = ctx.operatorsById.get(j.operatorId);
      if (op?.code === rule.operatorCode) count++;
    }
    return count >= rule.count;
  }
  const counts = new Map<string, number>();
  for (const j of ctx.allJourneys) {
    if (!j.operatorId) continue;
    counts.set(j.operatorId, (counts.get(j.operatorId) ?? 0) + 1);
  }
  for (const c of counts.values()) {
    if (c >= rule.count) return true;
  }
  return false;
}

function evalDifferentCount(rule: DifferentCountRule, ctx: AchievementContext): boolean {
  const seen = new Set<string>();
  switch (rule.entity) {
    case 'locations':
      for (const j of ctx.allJourneys) {
        seen.add(j.fromLocationId);
        seen.add(j.toLocationId);
      }
      break;
    case 'operators':
      for (const j of ctx.allJourneys) if (j.operatorId) seen.add(j.operatorId);
      break;
    case 'vehicles':
      for (const j of ctx.allJourneys) if (j.vehicleId) seen.add(j.vehicleId);
      break;
    case 'countries': {
      if (!ctx.locationsById) return false;
      for (const j of ctx.allJourneys) {
        const from = ctx.locationsById.get(j.fromLocationId);
        const to = ctx.locationsById.get(j.toLocationId);
        if (from?.country) seen.add(from.country);
        if (to?.country) seen.add(to.country);
      }
      break;
    }
  }
  return seen.size >= rule.count;
}

function evalTimeWindow(rule: TimeWindowRule, ctx: AchievementContext): boolean {
  const days = ctx.allJourneys
    .map((j) => Date.parse(j.date))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  if (days.length < rule.minJourneys) return false;

  const windowMs = rule.windowDays * 24 * 60 * 60 * 1000;
  let left = 0;
  for (let right = 0; right < days.length; right++) {
    while (days[right]! - days[left]! > windowMs) left++;
    if (right - left + 1 >= rule.minJourneys) return true;
  }
  return false;
}

function evalCabinClass(rule: CabinClassRule, ctx: AchievementContext): boolean {
  return ctx.allJourneys.some((j) => j.cabinClass === rule.cabinClass);
}

function seasonOf(monthIndex: number): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (monthIndex >= 2 && monthIndex <= 4) return 'spring';
  if (monthIndex >= 5 && monthIndex <= 7) return 'summer';
  if (monthIndex >= 8 && monthIndex <= 10) return 'autumn';
  return 'winter';
}

function evalSeasonComplete(rule: SeasonCompleteRule, ctx: AchievementContext): boolean {
  const seen = new Set<string>();
  for (const j of ctx.allJourneys) {
    if (!j.date) continue;
    const d = new Date(j.date);
    if (rule.year !== undefined && d.getUTCFullYear() !== rule.year) continue;
    seen.add(seasonOf(d.getUTCMonth()));
    if (seen.size === 4) return true;
  }
  return seen.size === 4;
}

function evalMonthComplete(rule: MonthCompleteRule, ctx: AchievementContext): boolean {
  const seen = new Set<number>();
  for (const j of ctx.allJourneys) {
    if (!j.date) continue;
    const d = new Date(j.date);
    if (rule.year !== undefined && d.getUTCFullYear() !== rule.year) continue;
    seen.add(d.getUTCMonth());
    if (seen.size === 12) return true;
  }
  return seen.size === 12;
}
