// Dashboard daily-note widget: its view and the changes that reload it.
import DailyNoteOpen from "./ui/DailyNoteOpen.vue";
import { loadDailyNote } from "./model/store.js";

export const dailyNoteWidget = {
  dataview: [], view: DailyNoteOpen, load: loadDailyNote, watches: [],
};

export { openDaily } from "./ui/openDaily.js";
