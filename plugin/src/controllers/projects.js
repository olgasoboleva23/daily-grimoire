// Project and stage deletion, and scheduling a stage task.
import { Notice } from "obsidian";
import { app as vaultApp } from "#/shared/host/index.js";
import { MASTER } from "#/shared/config/index.js";
import { edit } from "#/shared/vault/index.js";
import { notes } from "#/store/tasks.js";
import { removeProjectRecord, removeStageRecord } from "#/entities/project/index.js";
import { parseNote } from "#/shared/lib/noteLines.js";
import { Task } from "#/entities/task/index.js";
import { editTaskLine } from "#/controllers/tasks.js";

// Check the snapshot from the confirmation and keep covers referenced by another project.
export async function deleteProject(key, before, trash = f => vaultApp.fileManager.trashFile(f)) {
  const removed = await removeProjectRecord(key, before);

  if (!removed) return false;
  await notes.edit(all => {
    const owned = Object.entries(all)
      .filter(([, n]) => n.owner?.kind === "project" && n.owner.id === key);

    if (!owned.length) return null;
    for (const [id] of owned) delete all[id];
    return all;
  });
  const file = removed.unusedCover && vaultApp.vault.getFileByPath(removed.unusedCover);

  if (file) await trash(file);
  return true;
}

export async function deleteStage(key, index, before, { deleteTasks }) {
  const exclusive = await removeStageRecord(key, index, before, deleteTasks);

  if (!exclusive) return false;
  const stageId = before.id;

  await notes.edit(all => {
    const related = Object.values(all)
      .filter(n => n.target.kind === "stage" && n.target.id === stageId);

    if (!related.length) return null;
    for (const n of related) n.target = { kind: "project", id: key };
    return all;
  });
  if (exclusive.size) {
    try {
      await edit(MASTER, text => {
        const remove = new Set();

        for (const item of parseNote(MASTER, text)) {
          const t = Task.of(item);

          if (t.isOpen && exclusive.has(t.id) && !t.date && !t.fields.start) remove.add(item.line);
        }

        return text.split("\n").filter((_, i) => !remove.has(i)).join("\n");
      });
    } catch (error) {
      new Notice("Этап удалён, но удалить открытые задачи без даты не удалось.");
      throw error;
    }
  }

  return true;
}

// a task on a calendar day
export const toCalendar = (t, date) => editTaskLine(t, l => new Task(l).setDue(date));
