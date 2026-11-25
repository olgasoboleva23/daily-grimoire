// Actions exposed by the calendar's task rows and drag zones.
import { T, Task, placeTask, reorderTasks, setDue, taskFromPool } from "#/entities/task/index.js";
import { deleteTaskLine, editTaskLineWithUndo, tickTask } from "./tasks.js";

export function makeActions(ctx) {
  const { today, TASKS } = ctx;
  // ⏭ skip a dated 🔁 task this time: the rule moves on (Tasks makes the next copy), this one stays
  // as cancelled "- [-] … [cancelled:: date]", which counts as neither done nor missed
  const canSkip = t => !!TASKS && T(t).canSkip;
  // a missed copy skipped: the next one from today on (skipLines)
  const skip    = t => editTaskLineWithUndo(t, line => Task.skipLines(
    TASKS.executeToggleTaskDoneCommand(line, t.path), T(t).isOverdue(today) ? today : null), "⏭");
  const unplan  = t =>
    editTaskLineWithUndo(t, line => new Task(line).place(null, false), "↩ no date");
  const fromPool = (t, day, done) => taskFromPool(t, day, done, today);
  const place = (t, day, done) => placeTask(t, day, done, today, TASKS);

  // "Missed?": done on its own day, or moved to today
  const doneOnItsDay = t => editTaskLineWithUndo(t,
    line => Task.backdateDone(TASKS.executeToggleTaskDoneCommand(line, t.path), T(t).date, today),
    "✓");
  const toToday      = t => setDue(t, today);
  // ⏸ pause: drop its dates; ▶ resume: from today, on the first day its rule allows
  const pauseOrResume = t =>
    editTaskLineWithUndo(t, line => new Task(line).togglePause(today), T(t).isPaused ? "▶" : "⏸");
  const reorder = (t, to, after, day) => reorderTasks(ctx.model.openOn(day), t, to, after);

  return {
    canSkip, skip, tick: tickTask, unplan, fromPool, place, reorder, doneOnItsDay, toToday,
    pauseOrResume,
    remove: deleteTaskLine,
  };
}
