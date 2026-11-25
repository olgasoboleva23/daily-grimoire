// The daily note button's controller ("✦ Open"): the page's date's daily note, opened, made first
// when it's missing (the daily template). The markup: widgets/DailyNoteOpen.vue.
import { Platform } from "obsidian";
import { ymd } from "#/shared/lib/dates.js";
import { app, inUi } from "#/shared/host/index.js";
import { dailyFolder } from "#/shared/config/index.js";
import { createDoc, daily } from "#/entities/doc/index.js";

// the page's date (none: nothing shown) and the button's text: on the phone only the ✦ (the word
// didn't fit next to the date row)
export const loadDailyNote = async ({ dv }) =>
  ({ date: ymd(dv.current()?.date), text: Platform.isMobile ? "✦" : "✦ Open" });

// the day's note opened, made first when it's missing
export async function openDaily(date) {
  const folder = dailyFolder(app), path = daily.link(folder, { date });

  if (app.metadataCache.getFirstLinkpathDest(path, "")) {
    return app.workspace.openLinkText(path, "", inUi());
  }

  const title = window.moment(date).format("dddd, MMMM D");
  const file = await createDoc(daily, { date, title }, folder);

  await app.workspace.getLeaf(inUi() ? "tab" : false).openFile(file);
}
