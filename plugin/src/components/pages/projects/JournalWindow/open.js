// Opens a project's journal viewer from its project card.
import { openWindow } from "#/shared/ui/Window/index.ts";
import JournalWindow from "./index.vue";

export const openJournal = project => openWindow(JournalWindow, { project });
