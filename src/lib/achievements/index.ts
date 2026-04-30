import type { Achievement, Journey } from '@/db/schema';

export interface AchievementEvaluationContext {
  journeys: Journey[];
  achievements: Achievement[];
}

export interface AchievementUpdate {
  code: string;
  progress: number;
  unlocked: boolean;
}

export function evaluateAchievements(_ctx: AchievementEvaluationContext): AchievementUpdate[] {
  return [];
}
