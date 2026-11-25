// Serialize task line changes, their matching record patches and guarded undo.
import { Notice } from "obsidian";
import { editLine, serial, undoLines } from "#/shared/vault/index.js";
import { app } from "#/shared/host/index.js";
import { MASTER } from "#/shared/config/index.js";
import { Task } from "./task.js";
import { nextVariantAfter, VariantProblem } from "./variant.js";
import { recordsFromDisk, saveRecords } from "./repository/tasks.js";
import { parseNote } from "#/shared/lib/noteLines.js";
import { editMaster, prependLine } from "./repository/master.js";

// One write at a time, including its queue change and undo; dialogs do not hold the queue.
export const writeTask = serial();

export const editTaskLine = (t, fn) => writeTask(() => changeTaskLine(t, fn));

// Keep Tasks' output intact. If the JSON save fails, restore only our unchanged log edit.
// A modal supplies the original line and record so a concurrent edit wins over the old form.
export async function changeTaskLine(t, fn, patch = {}, expected = null) {
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

// The native task line is prepended only when Master.md exists.
export async function addTask(line) {
  const saved = await prependLine(line);

  if (!saved) new Notice(`✦ ${MASTER} not found — task not saved`);
  return saved;
}

// Remove a stage's exclusively owned open task lines only while they are still undated.
export const removeUndatedLines = exclusive => editMaster(text => {
  const remove = new Set();

  for (const item of parseNote(MASTER, text)) {
    const task = Task.of(item);

    if (task.isOpen && exclusive.has(task.id) && !task.date && !task.fields.start)
      remove.add(item.line);
  }

  return text.split("\n").filter((_, i) => !remove.has(i)).join("\n");
});
