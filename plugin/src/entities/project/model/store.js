// Projects in file order, with the task IDs attached to their stages.
import { ref } from "vue";
import { projects } from "./repository/projects.js";

export const projectStore = {
  version: ref(0),
  inProject: new Set(),
  get projects() { return projects.records; },
  putProjects(json) {
    const ids = new Set(Object.values(json)
      .flatMap(p => (p.stages ?? []).flatMap(s => s.tasks ?? [])));

    projects.load(json);
    this.inProject = ids;
    this.version.value++;
  },
};
