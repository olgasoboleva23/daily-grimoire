// Public entry for projects.
export { noteStore } from "./model/store.js";

// TODO: remove these action exports when the journal views move into this page.
export { addNote, editNote, removeNote } from "./model/note.js";

// TODO: remove the operation exports when the project and stage delete confirmations move here.
export { deleteProject } from "./operation/deleteProject.js";

export { deleteStage } from "./operation/deleteStage.js";
