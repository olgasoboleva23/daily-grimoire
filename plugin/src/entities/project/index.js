// Public entry for project.
export { projectStore } from "./model/store.js";

export { readProject, readStage } from "./model/repository/projects.js";

export {
  createProject, newProject, saveProject, editProject,
  renameStage, addLink, removeLink, addStage, addTaskToStage, stageIndex,
  stageTasks, openProjects, removeProjectRecord, removeStageRecord,
} from "./model/project.js";

export { openEditProject, openNewProject } from "./ui/ProjectWindow/open.js";
