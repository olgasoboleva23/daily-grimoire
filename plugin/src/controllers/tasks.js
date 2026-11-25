// Task editor and calendar operations compose the task entity's stale-checked actions.
import { Notice } from "obsidian";
import { parseNote } from "#/shared/lib/noteLines.js";
import { MASTER } from "#/shared/config/index.js";
import { undoNotice } from "#/shared/ui/undoNotice.js";
import {
  Task, VariantProblem, addTask, changeTaskLine, editTaskLine, masterText, newId, nextVariantAfter,
  recordOf, recordsFromDisk, removePrependedLine, saveRecords, variantsProblem, writeTask,
} from "#/entities/task/index.js";

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

// A new task from the New task command: `name` (a past task's, or a typed one), the window's
// picks, the Tasks dialog's result line. The name is the dialog's (its words may have been changed
// there). A past task (`oldId`) whose name is unchanged (case and spaces aside) reuses its id and
// record, and so does a name some record already has; any other name is a new task: a new id and
// a record. To the pool (pick.pool): a record with pool: true, no line; else the line (id, dates)
// on top of Master.md (false when Master.md is missing). One save at a time, the ids worked out
// from tasks.json and Master.md as they are on disk now (the store sees a write a moment later), so
// two saves at once never get one id.
export const saveNewTask = (...args) => writeTask(() => saveNew(...args));

async function saveNew(name, pick, result, oldId = null) {
  const parsed = await recordsFromDisk();

  if (!parsed) return;
  const records = new Map(Object.entries(parsed));
  const tasks = parseNote(MASTER, await masterText()).filter(i => i.status !== null);
  const final = Task.unnamed(result, "t0").name || name;
  const same = id => Task.nameKey(records.get(id)?.name ?? "") === Task.nameKey(final);
  const old = same(oldId) ? oldId : [...records.keys()].find(same) ?? null;
  const id = old ?? newId(records, tasks);
  const back = Task.unnamed(result, id);

  const patch = {
    ...old ? {} : { goal: null, after: null },
    ...recordOf(pick), name: final, ...pick.pool ? { pool: true } : {},
  };
  const record = { ...records.get(id), ...patch };
  const problem = variantsProblem(record.variants ?? [], record.currVariant);

  if (problem) return void new Notice(problem);
  if (pick.pool) return await saveRecords({ [id]: patch }, { [id]: records.get(id) }) && id;
  let variant;

  try {
    variant = nextVariantAfter(Task.created(id, "").line, back.line,
      record, tasks.map(t => Task.of(t).line));
  } catch (error) {
    if (!(error instanceof VariantProblem)) throw error;
    return void new Notice(`✦ ${error.message}`);
  }

  if (variant !== null) patch.currVariant = variant;
  if (!await addTask(back.line)) return false;
  const rollback = () => removePrependedLine(back.line);

  try {
    if (await saveRecords({ [id]: patch }, { [id]: records.get(id) })) return id;
    await rollback();
    return false;
  } catch (error) {
    await rollback();
    throw error;
  }
}

// 🗑: the line deleted; a pool item (no line) taken out of the pool, its record and history kept
// (an undefined field is left out of the JSON)
export async function deleteTaskLine(t) {
  if (!t.pool) {
    const undo = await editTaskLine(t, () => null);

    return undoNotice("🗑", Task.of(t).text, undo);
  }

  await saveRecords({ [t.id]: { pool: undefined } });
  undoNotice("🗑", Task.of(t).text, () => saveRecords({ [t.id]: { pool: true } }));
}
