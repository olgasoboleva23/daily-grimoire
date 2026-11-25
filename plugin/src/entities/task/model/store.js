// Loaded task items from Master.md, their records, and the pool drawn from those records.
import { ref } from "vue";
import { TASK_RECORDS } from "#/shared/config/index.js";
import { parseNote } from "#/shared/lib/noteLines.js";
import { Task } from "./task.js";
import { records } from "./repository/tasks.js";

let items = [];

const refresh = () => {
  const recs = records.records;
  const rec = i => recs.get(new Task(`- ${i.text}`).id) ?? null;

  taskStore.tasks = items.filter(i => i.status !== null)
    .map(i => ({ ...i, rec: rec(i) }));
  taskStore.pool = [...recs].filter(([, r]) => r.pool)
    .map(([id, r]) => ({ id, pool: true, rec: r, path: TASK_RECORDS }));
  taskStore.version.value++;
};

export const taskStore = {
  tasks: [], pool: [], ready: false, version: ref(0),
  get records() { return records.records; },
  put(path, text) { items = parseNote(path, text); refresh(); },
  putRecords(json) {
    if (Object.values(json).includes(null)) throw new TypeError("a null record");
    records.load(json);
    refresh();
  },
  drop() { items = []; refresh(); },
  refresh,
};
