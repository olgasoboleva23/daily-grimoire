// The records available in task search.
import { Task, historyOf } from "./task.js";

// Every record of tasks.json (pool ones too) once, for the "New task" search: its name and picks,
// how many lines with its id are done and when last; by `areaOrder` (area keys, the rest after),
// then the most done and the most recent first.
export function taskChoices(tasks, records, areaOrder) {
  const done = historyOf(tasks.filter(t => t.id && t.isDone));
  const rank = area => areaOrder.indexOf(area) >>> 0;

  return [...records].map(([id, r]) => ({
    id, name: r.name ?? id, area: r.area ?? null,
    picks: new Task("", null, r).picks,
    done: done.get(id)?.count ?? 0, last: done.get(id)?.last || null,
  })).sort((a, b) => rank(a.area) - rank(b.area) || b.done - a.done
    || (b.last ?? "").localeCompare(a.last ?? ""));
}
