// @ts-check
// Play the end-of-session sound for a focus session or meditation.
import { AudioEngine } from "#/shared/lib/sounds.js";
import { ASSETS, SOUNDS } from "#/shared/config/index.js";

// the end of a session; a meditation's: a slow chime
const sparkle = new AudioEngine(`${ASSETS}/sparkle.wav`);
const chime = new AudioEngine(`${SOUNDS}/snd_pressure_chime.wav`);

/** @param {number} rate */
export const ding = rate => sparkle.play({ rate });

export const bell = () => chime.play({ rate: 0.7, gain: 0.35, duration: 3 });
