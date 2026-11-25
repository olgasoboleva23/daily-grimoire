// Open the task fields and native Tasks editor, then save against the snapshot taken before either.
import { Task, openTaskWindow, readTaskEdit } from "#/entities/task/index.js";
import { tasksApi } from "#/shared/host/index.js";
import { saveTaskEdit } from "../operation/saveTaskEdit.js";

export async function editTask(t) {
  const read = await readTaskEdit(t);
  const api = tasksApi();

  if (!read || (!t.pool && !api)) return;
  const pick = await openTaskWindow({ preset: read.preset, variants: read.variants });

  if (!pick) return;
  let edited = null;

  if (!t.pool) {
    const task = new Task(read.line, t, read.record ?? t.rec);

    edited = await api.editTaskLineModal(task.named(task.name));
  }

  await saveTaskEdit(t, read, pick, edited);
}
