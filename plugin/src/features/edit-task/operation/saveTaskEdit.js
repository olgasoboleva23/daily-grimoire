// Save a task editor's picks only while its original record and native task line still match.
import { Task, changeTaskLine, recordOf, saveRecords, writeTask } from "#/entities/task/index.js";

export async function saveTaskEdit(t, { record, line }, pick, edited) {
  if (!t.pool && !edited) return;
  const id = Task.of(t).id;
  const patch = recordOf(pick);

  if ("pool" in pick) patch.pool = pick.pool || undefined;
  if (t.pool) {
    if (pick.name) patch.name = pick.name;
    await writeTask(() => saveRecords({ [id]: patch }, { [id]: record }));
    return;
  }

  const back = Task.unnamed(edited, id);

  patch.name = back.name || new Task(line, t, record ?? t.rec).name;
  await writeTask(() => changeTaskLine(t, () => back.line, patch, { line, record }));
}
