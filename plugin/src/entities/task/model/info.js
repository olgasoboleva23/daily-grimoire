// The task label, colour, sticker and key used on calendars and project stages.
import { T, taskKey } from "./task.js";

export function taskInfo(t, config, app) {
  const task = T(t), area = task.area;
  const stickerFile = task.sticker && app.metadataCache.getFirstLinkpathDest(task.sticker, t.path);

  return {
    key: taskKey(t), area, color: config.areaColors[area] ?? null,
    difficulty: task.difficulty, goal: !!task.goal, text: task.text,
    pool: !!t.pool,
    daytime: task.isRecurring ? null : task.daytime,   // a 🔁 task's is its box heading's
    label: `${config.areaIcons[area] ?? ""} ${task.text}`.trim(),
    sticker: stickerFile ? app.vault.getResourcePath(stickerFile) : null,
  };
}
