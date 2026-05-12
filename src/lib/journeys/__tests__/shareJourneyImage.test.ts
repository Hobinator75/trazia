/* eslint-disable import/first -- vi.mock hoisting forces the SUT import below the mocks. */
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  captureRef: vi.fn(),
  shareAsync: vi.fn(),
  isAvailableAsync: vi.fn(),
}));

vi.mock('react-native-view-shot', () => ({
  captureRef: mocks.captureRef,
}));

vi.mock('expo-sharing', () => ({
  shareAsync: mocks.shareAsync,
  isAvailableAsync: mocks.isAvailableAsync,
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import { shareJourneyImage } from '../shareJourneyImage';

afterEach(() => {
  mocks.captureRef.mockReset();
  mocks.shareAsync.mockReset();
  mocks.isAvailableAsync.mockReset();
});

describe('shareJourneyImage', () => {
  const ref = { current: { fake: 'view' } } as unknown as Parameters<
    typeof shareJourneyImage
  >[0]['ref'];

  it('captures the ref and shares the resulting tmpfile via expo-sharing', async () => {
    mocks.captureRef.mockResolvedValue('file:///tmp/share.png');
    mocks.isAvailableAsync.mockResolvedValue(true);
    mocks.shareAsync.mockResolvedValue(undefined);

    const result = await shareJourneyImage({ ref, dialogTitle: 'Share' });

    expect(result).toEqual({ ok: true });
    expect(mocks.captureRef).toHaveBeenCalledWith(ref, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    expect(mocks.shareAsync).toHaveBeenCalledWith(
      'file:///tmp/share.png',
      expect.objectContaining({ mimeType: 'image/png', dialogTitle: 'Share' }),
    );
  });

  it('bails with unavailable when expo-sharing is not supported', async () => {
    mocks.captureRef.mockResolvedValue('file:///tmp/share.png');
    mocks.isAvailableAsync.mockResolvedValue(false);

    const result = await shareJourneyImage({ ref, dialogTitle: 'Share' });

    expect(result).toEqual({ ok: false, reason: 'unavailable' });
    expect(mocks.shareAsync).not.toHaveBeenCalled();
  });

  it('forwards captureRef errors as failed results with the message', async () => {
    mocks.captureRef.mockRejectedValue(new Error('snapshot failed'));

    const result = await shareJourneyImage({ ref, dialogTitle: 'Share' });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('failed');
    expect(result.message).toBe('snapshot failed');
  });

  it('bails when the ref is empty (card not mounted yet)', async () => {
    const emptyRef = { current: null } as unknown as Parameters<
      typeof shareJourneyImage
    >[0]['ref'];
    const result = await shareJourneyImage({ ref: emptyRef, dialogTitle: 'Share' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('failed');
    expect(mocks.captureRef).not.toHaveBeenCalled();
  });
});
