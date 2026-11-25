// Let Tasks produce the next recurring copy and return the guarded undo for the changed lines.
import { T, Task, editTaskLine } from "#/entities/task/index.js";
import { tasksApi } from "#/shared/host/index.js";

export const tickTask = t =>
  editTaskLine(t, line => tasksApi().executeToggleTaskDoneCommand(line, t.path));

// Skipping an overdue copy schedules its next occurrence from today.
export const skip = (t, today, api) => editTaskLine(t, line => Task.skipLines(
  api.executeToggleTaskDoneCommand(line, t.path), T(t).isOverdue(today) ? today : null));

export const doneOnItsDay = (t, today, api) => editTaskLine(t, line =>
  Task.backdateDone(api.executeToggleTaskDoneCommand(line, t.path), T(t).date, today));
