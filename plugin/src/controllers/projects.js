// Project and stage deletion, and scheduling a stage task.
import { Notice } from "obsidian";
import { app as vaultApp } from "#/shared/host/index.js";
import { removeOwned, retarget } from "#/pages/projects/index.js";
import { removeProjectRecord, removeStageRecord } from "#/entities/project/index.js";
import { removeUndatedLines } from "#/entities/task/index.js";

// Check the snapshot from the confirmation and keep covers referenced by another project.
export async function deleteProject(key, before, trash = f => vaultApp.fileManager.trashFile(f)) {
  const removed = await removeProjectRecord(key, before);

  if (!removed) return false;
  await removeOwned(key);
  const file = removed.unusedCover && vaultApp.vault.getFileByPath(removed.unusedCover);

  if (file) await trash(file);
  return true;
}

export async function deleteStage(key, index, before, { deleteTasks }) {
  const exclusive = await removeStageRecord(key, index, before, deleteTasks);

  if (!exclusive) return false;
  const stageId = before.id;

  await retarget(stageId, key);
  if (exclusive.size) {
    try {
      await removeUndatedLines(exclusive);
    } catch (error) {
      new Notice("Этап удалён, но удалить открытые задачи без даты не удалось.");
      throw error;
    }
  }

  return true;
}
