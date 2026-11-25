// Calendar-only date changes. Each returns its undo after the line change.
import { Task, editTaskLine } from "#/entities/task/index.js";

export const unplan = t => editTaskLine(t, line => new Task(line).place(null, false));

export const pauseOrResume = (t, today) =>
  editTaskLine(t, line => new Task(line).togglePause(today));
