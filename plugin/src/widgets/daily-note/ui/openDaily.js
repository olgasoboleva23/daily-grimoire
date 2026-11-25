// Open the day's existing note, or create it from the daily template and open the new file.
import { app, inUi } from "#/shared/host/index.js";
import { dailyFolder } from "#/shared/config/index.js";
import { createDoc, daily } from "#/entities/doc/index.js";

export async function openDaily(date) {
  const folder = dailyFolder(app), path = daily.link(folder, { date });

  if (app.metadataCache.getFirstLinkpathDest(path, "")) {
    return app.workspace.openLinkText(path, "", inUi());
  }

  const title = window.moment(date).format("dddd, MMMM D");
  const file = await createDoc(daily, { date, title }, folder);

  await app.workspace.getLeaf(inUi() ? "tab" : false).openFile(file);
}
