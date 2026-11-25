// Reads and writes task edits, keeping metadata in tasks.json and native Tasks lines in
// Master.md. Pool items have a record only. Calendar writes can return an undo action.
import { Notice } from "obsidian";
import { editLine, serial, undoLines } from "#/shared/vault/index.js";
import { tasksApi, app } from "#/shared/host/index.js";
import {
  Task, VariantProblem, newId, nextVariantAfter, recordOf, variantsProblem, masterText,
  prependLine, recordsFromDisk, removePrependedLine, saveRecords,
} from "#/entities/task/index.js";
import { parseNote } from "#/shared/lib/noteLines.js";
import { MASTER } from "#/shared/config/index.js";

// One write at a time, including its queue change and undo; dialogs do not hold the queue.
const writeTask = serial();

export const editTaskLine = (t, fn) => writeTask(() => changeTaskLine(t, fn));

// Keep Tasks' output intact. If the JSON save fails, restore only our unchanged log edit.
// A modal supplies the original line and record so a concurrent edit wins over the old form.
async function changeTaskLine(t, fn, patch = {}, expected = null) {
  const id = Task.of(t).id;
  const all = await recordsFromDisk();

  if (!all) return null;
  const record = all[id];
  const stale = expected ? JSON.stringify(record) !== JSON.stringify(expected.record)
    : new Task("", null, record).currVariant !== Task.of(t).currVariant;

  if (stale) {
    new Notice("✦ task record changed, try again");
    return null;
  }

  const updated = { ...record, ...patch };
  let before, after, around;

  try {
    if (!await editLine(t.path, t.line,
      line => expected ? line === expected.line : new Task(line).sameAs(Task.of(t)),
      (line, lines) => {
        before = line;
        after = fn(line, lines);
        around = { above: lines[t.line - 1], below: lines[t.line + 1] };
        const next = nextVariantAfter(line, after, updated, lines.filter((_, i) => i !== t.line));

        if (next !== null) patch = { ...patch, currVariant: next };
        Object.assign(updated, patch);
        return after;
      })) return null;
  } catch (error) {
    if (!(error instanceof VariantProblem)) throw error;
    new Notice(`✦ ${error.message}`);
    return null;
  }

  const added = after === null ? [] : after.split("\n");
  const revert = () => undoLines(t.path, t.line, added, before, around)();

  try {
    if (Object.keys(patch).length && !await saveRecords({ [id]: patch }, { [id]: record })) {
      await revert();
      return null;
    }
  } catch (error) {
    await revert();
    throw error;
  }

  let undone = false;

  return () => writeTask(async () => {
    if (undone) return false;
    const queueChanged = "currVariant" in patch;

    if (queueChanged) {
      const all = await recordsFromDisk();

      if (!all) return false;
      if (JSON.stringify(all[id]) !== JSON.stringify(updated)) {
        new Notice("✦ task changed since completion — undo not applied");
        return false;
      }
    }

    if (!await revert()) return false;
    try {
      if (queueChanged && !await saveRecords({ [id]: { currVariant: record?.currVariant } },
        { [id]: updated })) {
        await undoLines(t.path, t.line, [before], after, around)();
        return false;
      }
    } catch (error) {
      await undoLines(t.path, t.line, [before], after, around)();
      throw error;
    }

    undone = true;
    return true;
  });
}

// Keep the raw line and record as they were before either window opens.
export async function readTaskEdit(t) {
  const original = Task.of(t), id = original.id;

  if (!id) return null;
  const all = await recordsFromDisk();

  if (!all) return null;
  const record = all[id];
  const task = new Task(original.line, t, record ?? t.rec);
  let line = null;

  if (!t.pool) {
    const file = app.vault.getFileByPath(t.path);

    if (!file) return null;
    line = (await app.vault.cachedRead(file)).split("\n")[t.line];
    if (!line || !new Task(line).sameAs(task)) return null;
  }

  const preset = { ...task.picks, pool: !!record?.pool };

  if (t.pool) preset.name = task.name;
  return { preset, variants: !!t.pool || task.isOpen, record, line };
}

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

// Change a task's line like editTaskLine (fn may return several lines, or null to delete), then
// show a notice "<mark> <task>  undo" for 8 s; undo puts the old line back if the new lines are
// still there (once).
export const editTaskLineWithUndo = async (t, fn, mark) => {
  const undo = await editTaskLine(t, fn);

  if (undo) undoNotice(t, mark, undo);
};

// the notice "<mark> <task>  Undo" for 8 s
function undoNotice(t, mark, undo) {
  const frag = document.createDocumentFragment();

  frag.append(`${mark} ${Task.of(t).text.slice(0, 40)}  `);
  const button = frag.appendChild(document.createElement("button"));

  button.textContent = "Undo";
  button.onclick = undo;
  new Notice(frag, 8000);
}

// 🗑: the line deleted; a pool item (no line) taken out of the pool, its record and history kept
// (an undefined field is left out of the JSON)
export async function deleteTaskLine(t) {
  if (!t.pool) return editTaskLineWithUndo(t, () => null, "🗑");
  await saveRecords({ [t.id]: { pool: undefined } });
  undoNotice(t, "🗑", () => saveRecords({ [t.id]: { pool: true } }));
}

// A new task is a native line at the top of Master.md.
export const addTask = line => prependLine(line);

// Tick (or untick) a task through the Tasks plugin, so a 🔁 one gets its next copy
export const tickTask = t =>
  editTaskLineWithUndo(t, line => tasksApi().executeToggleTaskDoneCommand(line, t.path), "✓");
