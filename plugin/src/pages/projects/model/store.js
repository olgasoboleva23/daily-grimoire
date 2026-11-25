// The Projects tab's state: what Obsidian saves with the workspace layout and gives back after a
// restart. `open` null = the list; a project's key = its page. `filter`: the list's status tab.

import { computed, ref } from "vue";
import { stageIndex } from "#/entities/project/index.js";
import { T, taskStore } from "#/entities/task/index.js";
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

export const stageEntries = computed(() => {
  void taskStore.version.value;
  return stageIndex(taskStore.tasks.map(T));
});

export const DEFAULT = Object.freeze({ open: null, filter: "all" });

export const FILTERS = ["all", "idea", "active", "paused", "done"];

// a saved state as a whole one: unknown or broken fields get their defaults
export function readState(saved) {
  const s = saved && typeof saved === "object" ? saved : {};

  return {
    open: typeof s.open === "string" ? s.open : null,
    filter: FILTERS.includes(s.filter) ? s.filter : "all",
  };
}
