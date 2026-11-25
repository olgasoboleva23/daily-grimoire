// Delete a confirmed stage, keep its journal, and optionally remove its exclusive undated tasks.
import { Notice } from "obsidian";
import { removeStageRecord } from "#/entities/project/index.js";
import { removeUndatedLines } from "#/entities/task/index.js";
import { retarget } from "../model/note.js";

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
