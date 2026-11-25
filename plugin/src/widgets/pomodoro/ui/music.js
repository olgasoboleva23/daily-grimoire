// @ts-check
// Meditation loop playback shared across the timers open in different tabs.
import { AudioEngine, isMuted } from "#/shared/lib/sounds.js";
import { SOUNDS } from "#/shared/config/index.js";

/** @typedef {import("../model/timer.js").Timer} Timer */

// The music choices shared by the settings window and meditation loop playback.
/** @type {Record<string, string>} */
export const MUSIC = { pad: "Pad", bells: "Bells", harp: "Harp" };

// "<name>|<start>" for a running meditation with music and sound on, otherwise null.
/** @param {Timer} timer @param {boolean} muted */
export const musicKey = (timer, muted = isMuted()) =>
  timer.type === "meditation" && timer.running && MUSIC[timer.settings.music ?? ""] && !muted
    ? `${timer.settings.music}|${timer.start}` : null;

// the music to the timer: started (from the session's remaining time, so it fades out at the
// end, before the bell) or stopped; one track at a time, whatever the pomodoros shown
/** @type {{ key: string, handle: { stop(): void } | null } | null} */
let music = null;   // { key, handle }

/** @param {Timer} timer */
export async function syncMusic(timer) {
  const key = musicKey(timer);

  if (music?.key === key) return;
  music?.handle?.stop();
  music = key ? { key, handle: null } : null;
  if (!key) return;
  const handle = await new AudioEngine(`${SOUNDS}/meditation-${timer.settings.music}.flac`)
    .loop(timer.remaining);

  if (music?.key === key) music.handle = handle; else handle?.stop();
}
