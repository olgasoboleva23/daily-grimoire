// Pick or enter a task, ask for any missing fields, then open the native Tasks dialog.
import { Notice } from "obsidian";
import { Task, openTaskWindow, pickTask } from "#/entities/task/index.js";
import { tasksApi } from "#/shared/host/index.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { saveNewTask } from "../operation/saveNewTask.js";

export async function newTask() {
  const found = await pickTask();

  if (!found) return null;
  const ready = !found.isNew && found.picks.difficulty && found.picks.area;
  const pick = ready ? found.picks : await openTaskWindow({ preset: found.picks, isNew: true });

  if (!pick) return null;
  const api = tasksApi();

  if (!api) {
    new Notice("✦ Tasks plugin is off — task not saved");
    return null;
  }

  const edited = await api.editTaskLineModal(Task.created(found.name, todayYmd()).line);

  if (!edited) return null;
  return await saveNewTask(found.name, pick, edited, found.id) || null;
}
