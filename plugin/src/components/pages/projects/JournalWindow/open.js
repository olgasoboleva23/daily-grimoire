// Opens a project's journal viewer from its project card.
import { openWindow } from "#/components/uikit/Window/open.ts";
import JournalWindow from "./index.vue";

export const openJournal = project => openWindow(JournalWindow, { project });
