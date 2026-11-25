// Public entry for projects.
export { noteStore } from "./model/store.js";

// TODO: remove these action exports when the journal views move into this page.
export { addNote, editNote, removeNote } from "./model/note.js";

// TODO: drop these UI exports when ProjectPage and ProjectStage move into the page.
export { confirmDeleteProject } from "./ui/confirmDeleteProject.js";

export { default as DeleteStageWindow } from "./ui/DeleteStageWindow/index.vue";
