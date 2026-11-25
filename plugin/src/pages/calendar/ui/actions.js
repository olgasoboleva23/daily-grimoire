// Actions exposed by the calendar's task rows and drag zones.
import { T, placeTask, reorderTasks, setDue, taskFromPool } from "#/entities/task/index.js";
import { tick, skipTask, completeOnItsDay } from "#/features/complete-task/index.js";
import { togglePause, unplanTask } from "./plan.js";
import { deleteTask } from "#/features/edit-task/index.js";

export function makeActions(ctx) {
  const { today, TASKS } = ctx;

  return {
    canSkip: t => !!TASKS && T(t).canSkip,
    tick,
    skip: t => skipTask(t, today, TASKS),
    doneOnItsDay: t => completeOnItsDay(t, today, TASKS),
    unplan: unplanTask,
    pauseOrResume: t => togglePause(t, today),
    fromPool: (t, day, done) => taskFromPool(t, day, done, today),
    place: (t, day, done) => placeTask(t, day, done, today, TASKS),
    toToday: t => setDue(t, today),
    reorder: (t, to, after, day) => reorderTasks(ctx.model.openOn(day), t, to, after),
    remove: deleteTask,
  };
}
