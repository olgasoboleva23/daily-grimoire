// Schedule an existing task line or create a copy of a pool task.
import { Task } from "./task.js";
import { addTask, editTaskLine } from "./lineChange.js";

export const taskFromPool = (t, day, done, today) =>
  addTask(Task.created(t.id, today).place(day, done));

export async function placeTask(t, day, done, today, api) {
  if (t.pool) return taskFromPool(t, day, done, today);
  const repeat = line => done && api && new Task(line).isOpen && new Task(line).isRecurring;

  return editTaskLine(t, line => repeat(line)
    ? Task.backdateDone(api.executeToggleTaskDoneCommand(line, t.path), day, today)
    : new Task(line).place(day, done));
}

export const setDue = (t, date) => editTaskLine(t, line => new Task(line).setDue(date));
