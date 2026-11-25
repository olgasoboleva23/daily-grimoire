// Show the calendar's date and recurrence changes with their Undo button.
import { T } from "#/entities/task/index.js";
import { undoNotice } from "#/shared/ui/undoNotice.js";
import { pauseOrResume, unplan } from "../operation/planTask.js";

export async function unplanTask(t) {
  const undo = await unplan(t);
  undoNotice("↩ no date", T(t).text, undo);
}

export async function togglePause(t, today) {
  const mark = T(t).isPaused ? "▶" : "⏸";
  const undo = await pauseOrResume(t, today);
  undoNotice(mark, T(t).text, undo);
}
