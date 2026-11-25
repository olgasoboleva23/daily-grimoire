// Show the task and its Undo button after a successful completion or skip.
import { T } from "#/entities/task/index.js";
import { undoNotice } from "#/shared/ui/undoNotice.js";
import { tickTask, skip, doneOnItsDay } from "../operation/completeTask.js";

export async function tick(t) {
  const undo = await tickTask(t);
  undoNotice("✓", T(t).text, undo);
}

export async function skipTask(t, today, api) {
  const undo = await skip(t, today, api);
  undoNotice("⏭", T(t).text, undo);
}

export async function completeOnItsDay(t, today, api) {
  const undo = await doneOnItsDay(t, today, api);
  undoNotice("✓", T(t).text, undo);
}
