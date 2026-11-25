// Opening a project's window (ProjectWindow): ✦ New project (the Projects list, the command)
// then the app tab on the new project; Edit project (its page) with the project as it is on disk
// now, so one changed meanwhile is not overwritten. Resolve to what the window gives, null closed.
import { Notice } from "obsidian";
import { openWindow } from "#/components/uikit/Window/open.ts";
import { openUi } from "#/components/app/open.ts";
import { readProject } from "#/controllers/projects.js";
import ProjectWindow from "./index.vue";

export async function openNewProject() {
  const key = await openWindow(ProjectWindow);

  if (key) await openUi("projects", { open: key });
  return key;
}

export async function openEditProject(key) {
  const before = await readProject(key);

  if (!before) return void new Notice("✦ project changed or was deleted; open it again");
  return openWindow(ProjectWindow, { project: key, before });
}
