import * as Sharing from 'expo-sharing';
import { Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

interface ShareJourneyImageOptions {
  ref: React.RefObject<View | null>;
  dialogTitle: string;
}

interface ShareResult {
  ok: boolean;
  reason?: 'unavailable' | 'cancelled' | 'failed';
  message?: string;
}

// Captures the off-screen JourneyShareCard ref as a PNG and hands it to
// the system share sheet. Apple's Share extension picks up a file://
// PNG and presents proper "Save to Photos / Send via Messages" actions —
// `expo-sharing` is required for the file:// path, react-native's bare
// Share.share() only carries text/URL.
export async function shareJourneyImage({
  ref,
  dialogTitle,
}: ShareJourneyImageOptions): Promise<ShareResult> {
  if (!ref.current) {
    return { ok: false, reason: 'failed', message: 'No card ref' };
  }
  try {
    const uri = await captureRef(ref, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, reason: 'unavailable' };
    }
    await Sharing.shareAsync(uri, {
      dialogTitle,
      mimeType: 'image/png',
      UTI: Platform.OS === 'ios' ? 'public.png' : undefined,
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: 'failed',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
