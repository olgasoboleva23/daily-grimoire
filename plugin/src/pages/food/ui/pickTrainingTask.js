// Link an existing task to the training column in the food journal.
import { Notice } from "obsidian";
import { setTrainingTask } from "#/entities/food-log/index.js";
import { pickTask } from "#/entities/task/index.js";

export async function pickTrainingTask() {
  const pick = await pickTask();

  if (!pick) return;
  if (pick.isNew) return void new Notice("✦ pick a task you already have");
  await setTrainingTask(pick.id);
}
