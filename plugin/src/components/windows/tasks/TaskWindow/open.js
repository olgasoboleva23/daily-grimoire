// Opens Daily Grimoire's task window and the native Tasks dialog, then saves their results.
import { Notice } from "obsidian";
import { openWindow } from "#/shared/ui/Window/index.ts";
import { pickTask, readTaskEdit, Task, TaskWindow } from "#/entities/task/index.js";
import { saveNewTask, saveTaskEdit } from "#/controllers/tasks.js";
import { app, tasksApi } from "#/shared/host/index.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { STICKERS } from "#/shared/config/index.js";

function openTaskWindow(props) {
  const stickers = (app.vault.getFolderByPath(STICKERS)?.children ?? [])
    .filter(file => file.extension)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(file => ({ name: file.name, url: app.vault.getResourcePath(file) }));

  return openWindow(TaskWindow, { ...props, stickers });
}

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
