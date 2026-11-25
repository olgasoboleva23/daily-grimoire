// Loaded journal records and the version watched by the projects page.
import { ref } from "vue";
import { notes } from "./repository/notes.js";

export const noteStore = {
  version: ref(0),
  get notes() { return notes.records; },
  putNotes(json) {
    if (Object.values(json).includes(null)) throw new TypeError("a null record");
    notes.load(json);
    this.version.value++;
  },
};
