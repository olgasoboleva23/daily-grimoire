// Public entry for projects.
export { noteStore } from "./model/store.js";

// TODO: remove these action exports when the journal views move into this page.
export { addNote, editNote, removeNote } from "./model/note.js";

// TODO: drop these UI exports when ProjectPage and ProjectStage move into the page.
export { confirmDeleteProject } from "./ui/confirmDeleteProject.js";

export { default as DeleteStageWindow } from "./ui/DeleteStageWindow/index.vue";

export { default } from "#/components/pages/projects/index.vue";

export { FILTERS, readState, stageEntries } from "./model/store.js";

export { coverUrl } from "./model/cover.js";

export { journalOf } from "./model/journal.js";

export { fillStart, PROMPT_VARIABLES } from "./model/prompt.js";
