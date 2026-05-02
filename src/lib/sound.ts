import { useSettingsStore } from '@/stores/settings.store';

// Achievement-unlock chime. The expo-audio integration is sketched out below
// but kept inert until the audio asset is checked in — Metro statically
// analyses `require('./asset.mp3')`, so an inline require with a missing
// file would break the bundle. Once `assets/sounds/achievement_unlock_bronze.mp3`
// lands, swap the stub block for the wired block (kept side-by-side as a
// reminder), and a generic chime plays for every tier until silver/gold/
// platinum sounds are recorded.

type Player = { play: () => void };
let unlockPlayer: Player | null = null;
let attempted = false;

async function ensureUnlockPlayer(): Promise<Player | null> {
  if (unlockPlayer || attempted) return unlockPlayer;
  attempted = true;

  // Wired version (uncomment once the asset is checked in):
  //
  //   try {
  //     const audio = await import('expo-audio');
  //     // eslint-disable-next-line @typescript-eslint/no-require-imports
  //     const asset = require('../../assets/sounds/achievement_unlock_bronze.mp3');
  //     await audio.setAudioModeAsync({ playsInSilentMode: false });
  //     const player = audio.createAudioPlayer(asset);
  //     unlockPlayer = { play: () => player.play() };
  //     return unlockPlayer;
  //   } catch {
  //     unlockPlayer = null;
  //     return null;
  //   }

  return null;
}

export async function playUnlockSound(): Promise<void> {
  const enabled = useSettingsStore.getState().soundEnabled;
  if (!enabled) return;
  try {
    const player = await ensureUnlockPlayer();
    player?.play();
  } catch {
    // Silent: a missing chime should never break the unlock UX.
  }
}
