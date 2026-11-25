// One task: its line in the Tasks plugin's Dataview format (status, rule, dates) and the
// plugin's own part, its record in tasks.json (name, difficulty, area, daytime, goal, sticker,
// after), found by the line's id. What it is (getters) and how to change its line (methods that
// return the new line; widgets write it). The only place that knows the format:
//   - [ ] / [x] done / [-] skipped · t12 (its id: the record's key)
//   fields [key:: value]: repeat (the rule, up to its ]) · due · scheduled (wins over due) · start
//   · completion · cancelled · created
// No Obsidian globals (tested by tests/task.test.mjs).
// Wrap a store item ({ text, status, rec }, or a pool item { id, pool: true, rec }) with Task.of(t)
// (t is kept as .src, for its path and line) or a raw line with new Task(line, null, rec).
// A pool item is a record with pool: true, no line; its copies on the days are ordinary tasks with
// its id.
import { nextId } from "#/shared/lib/ids.js";
import { addDays, diffDays } from "#/shared/lib/dates.js";
import { projectRepeats } from "./repeat.js";
import { ANY, FIELD, LineItem, lineOf, withField } from "#/shared/lib/lineItem.js";

// the fields that put a task on a day
const DATES = ["due", "scheduled", "start"];

export class Task extends LineItem {
  static ID = /^t\d+(?=\s|$)/;   // the line's first word
  // a pool item: its id, no checkbox
  static of(t) { return new Task(t.pool ? `- ${t.id}` : lineOf(t), t, t.rec ?? null); }

  get isSkipped()  { return this.status === "-"; }
  get area()       { return this.rec?.area ?? null; }   // "body"
  get difficulty() { return this.rec?.difficulty ?? null; }
  // the id it follows, or several ids (whichever is present on the day)
  get after()      { return this.rec?.after ?? null; }
  // "morning" | "evening"
  get daytime()    { return this.rec?.daytime ?? null; }
  // the key of its goal in Goals.md ("workout")
  get goal()       { return this.rec?.goal ?? null; }
  get rule()       { return this.fields.repeat ?? null; }
  get isRecurring(){ return this.rule !== null; }
  get whenDone()   { return /when done$/.test(this.rule ?? ""); }
  get isBirthday() { return this.rule === "every year"; }
  get date()       { return this.fields.scheduled ?? this.fields.due ?? null; }   // the day it's on
  get skippedOn()  { return this.fields.cancelled ?? null; }
  get created()    { return this.fields.created ?? null; }
  // a 🔁 task with its dates dropped
  get isPaused()   { return this.isOpen && this.isRecurring && !this.date; }
  // ⏭ this time: a dated open 🔁 task
  get canSkip()    { return this.isOpen && this.isRecurring && !!this.date; }
  // open, its day gone by
  isOverdue(today) { return this.isOpen && !!this.date && this.date < today; }
  // its sticker's file name
  get sticker()    { return this.rec?.sticker ?? null; }
  get currVariant(){
    return this.variants.length ? this.rec?.currVariant ?? this.variants[0] : null;
  }
  get variants()   { return this.rec?.variants ?? []; }
  get text()       {
    return this.isOpen && this.currVariant ? `${this.name} · ${this.currVariant}` : this.name;
  }
  // a name compared with another: its words (not an id, even if it looks like one), lowercased
  static nameKey = name => new Task(`- [ ] ${name}`).words.toLowerCase();
  // a new open line: its text (an id, or a name for the Tasks dialog) and the day it was made
  static created = (text, today) => new Task(`- [ ] ${text} [created:: ${today}]`);
  // the same copy: its words, status and day (not its done copy, nor another day's)
  sameAs(other) {
    return this.key === other.key && this.status === other.status && this.date === other.date;
  }

  // ── edits: each returns the new line ──
  // set or clear the date of an open task: one date, due (an old scheduled goes)
  setDue(date) {
    if (!this.isOpen) return this.line;
    const base = withField(this.line, "scheduled", null);

    return withField(base, "due", date || null);
  }
  // put it on `date` as done (completion) or open and due that day (due, none for null). A 🔁
  // rule is left as is: no next copy is made here. To tick an open 🔁 task, go through the Tasks
  // plugin's toggle, then backdateDone.
  place(date, done) {
    if (!ANY.test(this.line)) return this.line;
    const base = withField(this.line, "completion", null)
      .replace(/^(\s*- \[)./, `$1${done ? "x" : " "}`);

    return done ? withField(base, "completion", date) : new Task(base).setDue(date);
  }
  // what the task window shows and sets: difficulty, area, daytime and the sticker
  get picks() {
    return {
      difficulty: this.difficulty, area: this.area,
      daytime: this.daytime, sticker: this.sticker,
      ...this.variants.length ? { variants: [...this.variants],
        currVariant: this.currVariant } : {},
    };
  }
  // the line with its id swapped for `name`: what the Tasks plugin's dialog shows and edits
  named(name) {
    const box = this.line.match(ANY)?.[0];

    if (!box) return this.line;   // no checkbox: nothing to name
    return [`${box} ${name}`, ...this.line.match(FIELD) ?? []]
      .join(" ");
  }
  // the dialog's result back: its words are the new name, the line gets `id` again (a 🔁 task
  // set to done there comes back as two lines, the next copy and the done one: each gets it)
  static unnamed(result, id) {
    const lines = result.split("\n").filter(l => ANY.test(l)).map(l => new Task(l));

    return { name: lines[0].words, line: lines.map(t => t.named(id)).join("\n") };
  }

  // the first day from `today` its rule allows: a weekday rule ("every week on Monday, …") its
  // next such day (today included), an interval rule ("every 3 days [when done]") today, any
  // other (the 1st, a year) none: the rule's own next is right
  firstDay(today) {
    const rule = this.rule ?? "";

    if (/^every (\d+ )?weeks? on /i.test(rule))
      return projectRepeats(rule, addDays(today, -1), addDays(today, 30))[0] ?? today;
    return /^every (\d+ )?(day|week|month)s?( when done)?$/i.test(rule) ? today : null;
  }
  // pause: drop its scheduled, due and start dates (it leaves the calendar). Resume: due on the
  // first day from today its rule allows (firstDay; none: today. ponytail: "every month on the
  // 1st" resumes today too)
  pause() { return DATES.reduce((l, k) => withField(l, k, null), this.line); }
  togglePause(today) { return this.isPaused ? this.resume(today) : this.pause(); }
  resume(today) { return withField(this.pause(), "due", this.firstDay(today) ?? today); }

  // ── the Tasks plugin's output of ticking a task today (the done line, plus the next copy of a 🔁
  // task) ── as if ticked on `date`: completion moves there, and a "when done" next copy moves back
  // with it
  static backdateDone(toggled, date, today) {
    const shift = diffDays(date, today);

    return toggled.split("\n").map(l => {
      const task = new Task(l);

      if (task.isDone) return task.place(date, true);
      if (!task.isOpen || !task.whenDone) return l;
      // A weekly weekday rule must stay on those weekdays when completion is backdated.
      // Shift start/scheduled/due together so their relative distances are retained.
      const weekday = /^every week on /i.test(task.rule) && task.date;
      const delta = weekday ? diffDays(task.firstDay(addDays(date, 1)), task.date) : shift;

      return l.replace(FIELD, (m, k, d) =>
        DATES.includes(k) ? `[${k}:: ${addDays(d, delta)}]` : m);
    }).join("\n");
  }
  // as a skip of this time: the done line turns cancelled ("- [-] … [cancelled:: date]"),
  // so the rule
  // moves on but nothing counts as done. `from` (today, for a missed copy): the next copy is due
  // on the first day from it the rule allows, not the one after the missed date (could be in the
  // past)
  static skipLines(toggled, from = null) {
    return toggled.split("\n").map(l => {
      if (/^\s*- \[x\]/.test(l))
        return l.replace(/^(\s*- \[)x/, "$1-").replace("[completion:: ", "[cancelled:: ");
      const day = from && new Task(l).isOpen && new Task(l).firstDay(from);

      return day ? new Task(l).setDue(day) : l;
    }).join("\n");
  }
}

// { count, last } by task key over `list` (Tasks): done copies by their completion date, skipped by
// their cancelled one
export const historyOf = list => {
  const by = new Map();

  for (const t of list) {
    const h = by.get(t.key) ?? { count: 0, last: "" }, on = t.doneOn ?? t.skippedOn ?? "";

    by.set(t.key, { count: h.count + 1, last: on > h.last ? on : h.last });
  }

  return by;
};

export const T = t => (t.uiTask ??= Task.of(t));   // a Dataview task's Task, made once

// A task's key in the calendar's rows (TaskRow, TaskCard, Missed): its file, line, status and id
// (its words without one). It names the same task in every draw: findTask() takes the task at that
// line if it still has that id and that status, else the nearest one in the file that has them
// (lines move when a task is added on top), else none — never another task.
const stateOf = t => t.pool ? "p" : t.status;

export const taskKey = t => [t.path, t.line, stateOf(t), T(t).key].join("|");

export function findTask(key, tasks) {
  const [path, line, state, ...rest] = String(key).split("|");

  if (!rest.length) return null;
  const text = rest.join("|"), want = Number(line);
  const same = tasks.filter(t => t.path === path && stateOf(t) === state && T(t).key === text);

  return same.sort((a, b) => Math.abs(a.line - want) - Math.abs(b.line - want))[0] ?? null;
}

// the next free id: the biggest t<N> of the records and of the lines (a line whose record was lost
// to a sync conflict keeps its id) plus one; other keys are skipped
export const newId = (records, tasks = []) =>
  nextId("t", [...records.keys(), ...tasks.map(t => Task.of(t).id).filter(Boolean)]);
