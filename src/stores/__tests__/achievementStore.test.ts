import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAchievementStore } from '../achievementStore';

describe('achievementStore', () => {
  afterEach(() => {
    useAchievementStore.getState().reset();
  });

  it('appendUnlocks fires the achievement_unlocked event for each new unlock', () => {
    const listener = vi.fn();
    const unsubscribe = useAchievementStore.getState().addListener(listener);

    useAchievementStore.getState().appendUnlocks([
      { achievementId: 'a', unlockedAt: '2026-01-01T00:00:00Z' },
      { achievementId: 'b', unlockedAt: '2026-01-02T00:00:00Z' },
    ]);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, {
      achievementId: 'a',
      unlockedAt: '2026-01-01T00:00:00Z',
    });
    expect(useAchievementStore.getState().unlocks).toHaveLength(2);

    unsubscribe();
  });

  it('addListener returns an unsubscribe function', () => {
    const listener = vi.fn();
    const unsubscribe = useAchievementStore.getState().addListener(listener);
    unsubscribe();

    useAchievementStore
      .getState()
      .appendUnlocks([{ achievementId: 'a', unlockedAt: '2026-01-01T00:00:00Z' }]);

    expect(listener).not.toHaveBeenCalled();
  });

  it('appendUnlocks with an empty array is a no-op', () => {
    const listener = vi.fn();
    useAchievementStore.getState().addListener(listener);
    useAchievementStore.getState().appendUnlocks([]);
    expect(listener).not.toHaveBeenCalled();
    expect(useAchievementStore.getState().unlocks).toEqual([]);
  });
});
