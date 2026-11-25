// Create a free journal from its Markdown template.
import { KINDS } from "#/models/kinds.js";
import { createNote } from "#/controllers/notes.js";

export const createJournal = values => createNote(KINDS.journal, values, KINDS.journal.folder);
