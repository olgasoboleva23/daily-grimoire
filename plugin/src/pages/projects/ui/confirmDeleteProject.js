// Confirm deletion against the current project and tell the page whether to close it.
import { readProject } from "#/entities/project/index.js";
import { confirm } from "#/shared/ui/Window/index.ts";
import { deleteProject } from "../operation/deleteProject.js";

// asked with the project as it is on disk; one changed meanwhile is not deleted (deleteProject)
export async function confirmDeleteProject(key) {
  const before = await readProject(key);

  if (!before) return false;
  const kept = "Journal entries are deleted. Tasks, calendar and history stay."
    + (before.cover ? " The cover goes to the trash." : "");
  const yes = await confirm("Delete project?",
    [{ name: "Project", text: before.name }, { name: "Kept", text: kept }]);

  return yes && deleteProject(key, before);
}
