import type { Journey, Location, Operator, Vehicle } from '@/db/schema';
import type { TransportMode } from '@/types/domain-types';

export type GeoCondition =
  | 'equator'
  | 'atlantic'
  | 'pacific'
  | 'polar_north'
  | 'polar_south'
  | 'antipode';

export type DifferentEntity = 'locations' | 'operators' | 'vehicles' | 'countries';

export interface CountRule {
  type: 'count';
  threshold: number;
  mode?: TransportMode;
}

export interface DistanceTotalRule {
  type: 'distance_total';
  thresholdKm: number;
  mode?: TransportMode;
}

export interface SingleJourneyDistanceRule {
  type: 'single_journey_distance';
  thresholdKm: number;
  mode?: TransportMode;
}

export interface SingleJourneyDurationRule {
  type: 'single_journey_duration';
  thresholdMinutes: number;
  mode?: TransportMode;
}

export interface GeoConditionRule {
  type: 'geo_condition';
  condition: GeoCondition;
  antipodeToleranceKm?: number;
}

export interface DateMatchRule {
  // pattern is either a full ISO date 'YYYY-MM-DD' or '--MM-DD' for
  // year-agnostic matches (e.g. birthdays).
  type: 'date_match';
  pattern: string;
}

export interface VehicleCategoryRule {
  type: 'vehicle_category';
  categories: string[];
}

export interface OperatorSetRule {
  type: 'operator_set';
  operatorCodes: string[];
  match?: 'any' | 'all';
}

export interface RouteRepeatRule {
  type: 'route_repeat';
  count: number;
}

export interface OperatorLoyaltyRule {
  type: 'operator_loyalty';
  count: number;
  operatorCode?: string;
}

export interface DifferentCountRule {
  type: 'different_count';
  entity: DifferentEntity;
  count: number;
}

export interface TimeWindowRule {
  type: 'time_window';
  windowDays: number;
  minJourneys: number;
}

export interface CabinClassRule {
  type: 'cabin_class';
  cabinClass: string;
}

export interface SeasonCompleteRule {
  type: 'season_complete';
  year?: number;
}

export interface MonthCompleteRule {
  type: 'month_complete';
  year?: number;
}

export type Rule =
  | CountRule
  | DistanceTotalRule
  | SingleJourneyDistanceRule
  | SingleJourneyDurationRule
  | GeoConditionRule
  | DateMatchRule
  | VehicleCategoryRule
  | OperatorSetRule
  | RouteRepeatRule
  | OperatorLoyaltyRule
  | DifferentCountRule
  | TimeWindowRule
  | CabinClassRule
  | SeasonCompleteRule
  | MonthCompleteRule;

export type RuleType = Rule['type'];

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'hidden' | 'premium';

export type AchievementCategory =
  | 'milestones'
  | 'geography'
  | 'distance'
  | 'airlines'
  | 'aircraft'
  | 'hidden'
  | 'premium';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  hidden?: boolean;
  premium?: boolean;
  tier?: AchievementTier;
  category?: AchievementCategory;
  rule: Rule;
  reward?: { points?: number };
  // Conceptual mode this achievement belongs to. 'cross' (or undefined) means
  // any journey can unlock it; 'flight' / 'train' etc. categorise it for UI
  // filters and the catalog test. The engine itself filters via rule.mode
  // where available — this field is orthogonal to evaluation.
  appliesTo?: 'cross' | TransportMode;
}

export interface AchievementUnlock {
  id?: string;
  achievementId: string;
  unlockedAt: Date | string;
  triggeringJourneyId?: string | null;
}

export interface AchievementContext {
  allJourneys: Journey[];
  allUnlocks: AchievementUnlock[];
  triggeringJourneyId?: string;
  locationsById?: Map<string, Location>;
  vehiclesById?: Map<string, Vehicle>;
  operatorsById?: Map<string, Operator>;
}

export interface UnlockResult {
  achievementId: string;
  unlockedAt: string;
  triggeringJourneyId?: string;
}
