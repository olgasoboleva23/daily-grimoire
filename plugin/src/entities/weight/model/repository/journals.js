// The free journals (a note each in JOURNALS: "- YYYY-MM-DD level reason, reason" lines; its name
// the file's, its `reasons` and `lag` properties): read for the weight card and the food page;
// trashed and updated with today's level and reasons.
import { app } from "#/shared/host/index.js";
import { BodyLog } from "../bodyLog.js";
import { edit } from "#/shared/vault/index.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { JOURNALS } from "#/shared/config/index.js";

// [{ path, name, reasons, lag, entries: Map date → { date, level, reasons } }], by name
export async function readJournals() {
  const notes = (app.vault.getFolderByPath(JOURNALS)?.children ?? [])
    .filter(f => f.extension === "md").sort((a, b) => a.basename.localeCompare(b.basename));

  return Promise.all(notes.map(async f => {
    const props = app.metadataCache.getCache(f.path)?.frontmatter ?? {};
    const file = app.vault.getFileByPath(f.path);
    const text = file ? await app.vault.cachedRead(file) : "";

    return {
      path: f.path, name: String(props.name ?? f.basename),
      reasons: (props.reasons ?? []).map(String),
      lag: Number(props.lag) || 0,   // the days after a meal its level is looked at (the food page)
      entries: new Map(new BodyLog(text).entries.map(e => [e.date, e])),
    };
  }));
}

// a journal into the trash (Obsidian's, as set: recoverable)
export async function trashJournal(path) {
  const file = app.vault.getFileByPath(path);

  if (file) await app.fileManager.trashFile(file);
}

export const logBody = (path, level, reasons) =>
  edit(path, c => new BodyLog(c).set(todayYmd(), level, reasons));
