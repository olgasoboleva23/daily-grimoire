// Keep task, project and journal data and settings current on ordered vault file events.
import { app } from "#/shared/host/index.js";
import {
  APP_NAME, applyConfig, CONFIG, MASTER, NOTES, PROJECTS, TASK_RECORDS,
} from "#/shared/config/index.js";
import { projectStore } from "#/entities/project/index.js";
import { taskStore } from "#/entities/task/index.js";
import { noteStore } from "#/pages/projects/index.js";

const jsonFiles = new Map([
  [TASK_RECORDS, text => taskStore.putRecords(JSON.parse(text ?? "{}"))],
  [PROJECTS, text => projectStore.putProjects(JSON.parse(text ?? "{}"))],
  [NOTES, text => noteStore.putNotes(JSON.parse(text ?? "{}"))],
  [CONFIG, text => {
    applyConfig(text === null ? undefined : JSON.parse(text));
    taskStore.refresh();
  }],
]);

const paths = [MASTER, ...jsonFiles.keys()];
const reads = new Map();   // path → its last read's number: an older read, or one of a note dropped
                           // since, is not put
let lastRead = 0;          // one count for every read, never reused (a note made again starts no
                           // new count that an old read's number could match)
const take = (path, text) => {
  if (path === MASTER) return taskStore.put(path, text ?? "");
  try {
    jsonFiles.get(path)(text);
  } catch (e) {
    console.error(`${APP_NAME}: ${path} isn't JSON, it's left as it was`, e);
  }
};

const drop = path => {
  reads.delete(path);
  take(path, null);
};

const read = async file => {
  const { path } = file, n = ++lastRead;

  reads.set(path, n);
  const text = await app.vault.cachedRead(file);

  if (reads.get(path) === n) take(path, text);
};

export function useTaskStore(plugin) {
  const changed = f => { if (paths.includes(f.path)) void read(f); };

  plugin.registerEvent(app.vault.on("modify", changed));
  plugin.registerEvent(app.vault.on("create", changed));
  plugin.registerEvent(app.vault.on("delete", f => paths.includes(f.path) && drop(f.path)));
  plugin.registerEvent(app.vault.on("rename", (f, old) => {
    if (paths.includes(old)) drop(old);
    changed(f);
  }));
  // the first read, once the vault's files are there: now when the layout is ready (the plugin
  // turned on later), else at the first of onLayoutReady and the cache's first "resolved" (at a
  // start, Obsidian 1.12 left a plugin's layout-ready callback uncalled; the files' own "create"
  // events have put the notes in by then, only `ready` waits)
  let started = false;
  const start = async () => {
    if (started) return;
    started = true;
    const present = paths.map(p => app.vault.getFileByPath(p))
      .filter(Boolean);

    taskStore.drop();
    try {
      for (const f of present) await read(f);   // the same guard as a change's read
    } catch (e) {
      started = false;   // the next "resolved" reads again

      return console.error(`${APP_NAME}: the tasks' notes weren't read`, e);
    }

    taskStore.ready = true;
    taskStore.refresh();
  };

  // "resolved" first: a first read that fails is tried again then, the plugin turned on late too
  plugin.registerEvent(app.metadataCache.on("resolved", start));
  if (app.workspace.layoutReady) void start();
  else app.workspace.onLayoutReady(start);
}
