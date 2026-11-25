// @ts-check
// Read pomodoro.json and serialize saves, including minutes from failed writes.
import { POMODORO } from "#/shared/config/index.js";
import { app } from "#/shared/host/index.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { readJson } from "#/shared/vault/index.js";
import { addStats } from "../timer.js";

/** @typedef {import("../timer.js").PomodoroData} PomodoroData */

/** @returns {Promise<PomodoroData>} */
export const readPomodoro = () => readJson(POMODORO, {});

// the save: settings, the current session, mini and today's stats (a finished focus session adds
// its minutes, a meditation its own: `kind`). One save at a time, each reading what the one before
// wrote (a finished session and the ⇄ click at once); the minutes of finished sessions a failed
// save didn't write go with the next save
let queue = Promise.resolve();
/** @type {{ min: number, kind: "focus" | "meditation" }[]} */
const unsaved = [];

/** @param {PomodoroData} state @param {number} min @param {"focus" | "meditation"} kind */
export function save({ settings, current, mini }, min = 0, kind = "focus") {
  if (min) unsaved.push({ min, kind });
  const write = queue.then(async () => {
    const sessions = unsaved.splice(0);

    try {
      const data = addStats(await readPomodoro(), 0, todayYmd());
      Object.assign(data, { settings, current });
      if (mini !== undefined) data.mini = mini;
      for (const s of sessions) addStats(data, s.min, todayYmd(), s.kind);
      await app.vault.adapter.write(POMODORO, JSON.stringify(data, null, 2));
    } catch (e) {
      unsaved.unshift(...sessions);
      throw e;
    }
  });
  queue = write.catch(() => {});
  return write;
}
