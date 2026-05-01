import { useSettingsStore } from '@/stores/settings.store';

// Sound is asset-graceful: the unlock chime expects
// assets/sounds/achievement_unlock.mp3 — if that file isn't bundled (e.g.
// during development before the audio asset is checked in) we silently skip
// playback rather than crash the bundler. Drop the asset in place and
// uncomment the require + createSound block below to wire it up.
//
// import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
// const UNLOCK_ASSET = require('../../assets/sounds/achievement_unlock.mp3');

let unlockPlayer: { play: () => void } | null = null;

async function ensureUnlockPlayer(): Promise<{ play: () => void } | null> {
  if (unlockPlayer) return unlockPlayer;

  // TODO CC-3.7: replace this stub with the real expo-audio integration once
  // the unlock chime asset is checked into assets/sounds/.
  //
  //   await setAudioModeAsync({ playsInSilentMode: false });
  //   const player = createAudioPlayer(UNLOCK_ASSET);
  //   unlockPlayer = { play: () => player.play() };
  //   return unlockPlayer;
  return null;
}

export async function playUnlockSound(): Promise<void> {
  const enabled = useSettingsStore.getState().soundEnabled;
  if (!enabled) return;
  try {
    const player = await ensureUnlockPlayer();
    player?.play();
  } catch {
    // Asset missing or audio session unavailable; silent failure is
    // intentional — we don't want a missing chime to break the unlock UX.
  }
}
