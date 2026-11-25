// Calendar history and entries for the days and panels drawn by the calendar.
import {
  T, Task, daytimeRank, historyOf, projectRepeats, taskInfo,
} from "#/entities/task/index.js";
import { addDays, diffDays, dm, weekday } from "#/shared/lib/dates.js";

const ORDER = { open: 0, ghost: 1, done: 2 };

// a one-off's place by time; a 🔁 task keeps its box's groups, so counts as none
const slot = t => daytimeRank(T(t).isRecurring ? null : T(t).daytime);

// a task with #after/id/<id> right under the task with #id/<id> when both are in `list` (after its
// earlier followers), with .follows set to it; the rest in their order
const chain = list => {
  const lead = e => T(e.t).after && list.find(x =>
    x !== e && [T(e.t).after].flat().includes(T(x.t).id));
  const out = list.filter(e => !lead(e));

  for (const e of list.filter(lead)) {
    e.follows = lead(e);
    let i = out.indexOf(e.follows);

    while (out[i + 1]?.follows === e.follows) i++;
    out.splice(i + 1, 0, e);
  }

  return out;
};

const doneText = h => `done ${h.count}× · last ${dm(h.last)}`;

// What the calendar shows, worked out once per draw from the tasks, the pool's records, the shown
// days, today and the areas' order (keys; unknown areas last):
//   byDay    day → entries { t, kind: open | ghost | done }: open ones on their date (today and
//            later; the overdue ones are in missed), done ones on their completion date, a 🔁
//            task's next repeats faded (future days only)
//   missed   "Missed?": open tasks whose day has passed, the latest first
//   backlog  No date: open one-offs with no date (not a project's: those are in Projects), by
//            area, then the longest waiting (created) first
//   pool     the pool's records, each { id, pool: true, rec, path } with its Task: by area, then
//            the longest since last done (never done first)
//   regulars open 🔁 tasks (an undated one is paused) but dated birthdays (a yearly rule, in Ahead):
//            by area, dated before paused, the longest overdue, then the longest since last done
//   ahead    open dated tasks (no 🔁, but birthdays) after today's week, by month:
//            [{ month: "2026-12", items }]; in a month by date, then area (the old Kanban's month /
//            year / future columns)
//   all      every task and pool item: what a row's key is looked up in
// and the meta lines of the bottom panel's cards.
export class CalendarData {
  /**
   * @param {{
   *   tasks: any[], poolLines: any[], days: string[], today: string, areaOrder?: string[],
   *   inProject?: Set<string>
   * }} args
   */
  constructor({ tasks, poolLines, days, today, areaOrder = [], inProject = new Set() }) {
    this.today = today;
    this.areaOrder = areaOrder;
    this.byDay = Object.fromEntries(days.map(d => [d, []]));
    const sunday = addDays(today, 7 - weekday(today));
    const backlog = [], ahead = [], last = days.at(-1);

    for (const t of tasks) {
      const task = T(t);

      if (task.isDone) {
        if (task.doneOn) this.byDay[task.doneOn]?.push({ t, kind: "done" });
        continue;
      }


      if (!task.isOpen) continue;   // skipped, in progress etc.
      const d = task.date;

      if (!d) { if (!task.isRecurring && !inProject.has(task.id)) backlog.push(t); continue; }

      if (d >= today) this.byDay[d]?.push({ t, kind: "open" });
      if ((!task.isRecurring || task.isBirthday) && d > sunday) ahead.push(t);
      if (task.rule)
        for (const g of projectRepeats(task.rule, d, last))
          if (g > today) this.byDay[g]?.push({ t, kind: "ghost" });
    }

    ahead.sort((a, b) => T(a).date.localeCompare(T(b).date) || this.rank(a) - this.rank(b));
    this.ahead = [];
    for (const t of ahead) {
      const month = T(t).date.slice(0, 7);

      if (this.ahead.at(-1)?.month !== month) this.ahead.push({ month, items: [] });
      this.ahead.at(-1).items.push(t);
    }

    for (const d of days) this.byDay[d].sort((a, b) => ORDER[a.kind] - ORDER[b.kind]
      || slot(a.t) - slot(b.t)
      || (T(a.t).rec?.order ?? Infinity) - (T(b.t).rec?.order ?? Infinity) || 0);
    this.doneBy = historyOf(tasks.map(T).filter(t => t.isDone && t.doneOn));
    this.skipsBy = historyOf(tasks.map(T).filter(t => t.isSkipped));
    this.missed = tasks.filter(t => T(t).isOverdue(today))
      .sort((a, b) => T(b).date.localeCompare(T(a).date));
    const pool = poolLines.map(({ id, rec, path }) => {
      const p = { id, pool: true, rec, path };
      p.uiTask = new Task(`- ${id}`, p, rec);
      return p;
    });
    this.all = [...tasks, ...pool];
    this.backlog = backlog.sort((a, b) =>
      this.rank(a) - this.rank(b) || (T(a).created ?? "9").localeCompare(T(b).created ?? "9"));
    this.pool = pool.sort((a, b) =>
      this.rank(a) - this.rank(b) || this.lastDone(a).localeCompare(this.lastDone(b)));
    this.regulars = this.sortRegulars(tasks.filter(t => T(t).isOpen && T(t).isRecurring));
  }

  // The task group that the calendar passes to a reorder operation.
  openOn(day) { return this.byDay[day].filter(e => e.kind === "open").map(e => e.t); }

  // the week's balance: for each of `areas` (keys), its tasks on the shown days (open + done; a 🔁
  // task's faded repeats don't count) and how many of them are done
  balance(areas) {
    const entries = Object.values(this.byDay).flat().filter(e => e.kind !== "ghost");

    return areas.map(area => {
      const mine = entries.filter(e => T(e.t).area === area);

      return { area, planned: mine.length, done: mine.filter(e => e.kind === "done").length };
    });
  }

  // a day's entries by where they go: rows (not 🔁), the 🔁 box (all of them for its n/m pill;
  // routineRows listed in it) and the done ones `shown` hides, counted as ✓N: under the day, and
  // the 🔁 ones inside the box
  dayParts(d, shown) {
    const all = chain(this.byDay[d]), routine = all.filter(e => T(e.t).isRecurring);

    return {
      rows: all.filter(e => shown[e.kind] && !routine.includes(e)),
      routine, routineRows: routine.filter(e => shown[e.kind]),
      hidden: all.filter(e => !shown[e.kind] && e.kind === "done" && !routine.includes(e)),
      routineHidden: routine.filter(e => !shown[e.kind] && e.kind === "done"),
    };
  }

  // the place of a task's area in the areas' order, unknown areas last
  rank(t) {
    const i = this.areaOrder.indexOf(T(t).area);

    return i < 0 ? this.areaOrder.length : i;
  }

  lastDone(t) { return this.doneBy.get(T(t).key)?.last ?? "0000"; }
  sortRegulars(list) {
    const next = t => T(t).date, today = this.today;
    const late = t => next(t) && next(t) < today ? diffDays(today, next(t)) : -1;

    return list.filter(t => !(T(t).isBirthday && next(t)))
      .sort((a, b) => this.rank(a) - this.rank(b) || !next(a) - !next(b) || late(b) - late(a)
        || this.lastDone(a).localeCompare(this.lastDone(b)));
  }

  backlogMeta(t) {
    const created = T(t).created, h = this.doneBy.get(T(t).key);

    return [created && `waiting ${diffDays(this.today, created)} d`, h && doneText(h)]
      .filter(Boolean).join("  ·  ");
  }
  poolMeta(t) {
    const h = this.doneBy.get(T(t).key);

    return h ? `${doneText(h)} · ${diffDays(this.today, h.last)} d ago` : "never done";
  }
  regularHistory(t) {
    const h = this.doneBy.get(T(t).key), s = this.skipsBy.get(T(t).key);

    return [h ? doneText(h) : "never done", s && `skipped ${s.count}×`].filter(Boolean).join(" · ");
  }
}

// A calendar view caches presentation within one draw and adds its own available actions.
export function calendarTaskInfo(t, ctx, app) {
  if (!ctx.infos.has(t)) {
    const canSkip = ctx.actions.canSkip(t);

    ctx.infos.set(t, { ...taskInfo(t, ctx.config, app),
      canSkip, canUnplan: !!T(t).date && !canSkip });
  }

  return ctx.infos.get(t);
}
