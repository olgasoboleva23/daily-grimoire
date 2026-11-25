// Opening a project's window (ProjectWindow): ✦ New project (the Projects list, the command)
// then the app tab on the new project; Edit project (its page) with the project as it is on disk
// now, so one changed meanwhile is not overwritten. Resolve to what the window gives, null closed.
import { openWindow } from "#/shared/ui/Window/index.ts";
import { openUi } from "#/shared/host/index.js";
import { changedProject, readProject } from "#/entities/project/index.js";
import ProjectWindow from "./index.vue";

export async function openNewProject() {
  const key = await openWindow(ProjectWindow);

  if (key) await openUi("projects", { open: key });
  return key;
}

export async function openEditProject(key) {
  const before = await readProject(key);

  if (!before) return void changedProject();
  return openWindow(ProjectWindow, { project: key, before });
}
