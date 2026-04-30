import type { AchievementUnlock, Journey } from '@/db/schema';

export interface AchievementEvaluationContext {
  journeys: Journey[];
  unlocks: AchievementUnlock[];
}

export interface AchievementUpdate {
  achievementId: string;
  progress: number;
  unlocked: boolean;
}

export function evaluateAchievements(_ctx: AchievementEvaluationContext): AchievementUpdate[] {
  return [];
}
