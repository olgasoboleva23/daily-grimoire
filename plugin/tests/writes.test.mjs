import { test } from "node:test";
import assert from "node:assert/strict";
import { Notice } from "obsidian";
import { setApp } from "#/shared/host/index.js";
import { logPurchase } from "#/controllers/widgets/shop.js";
import { addTask, readTaskEdit, saveNewTask, saveTaskEdit } from "#/controllers/tasks.js";
import { saveRecords, newId, taskStore } from "#/entities/task/index.js";
import { makeActions } from "#/controllers/calendar.js";
import { CalendarData } from "#/models/calendarData.js";

const MASTER = "00 System/Data/Tasks/Master.md", RECORDS = "00 System/Data/Tasks/tasks.json", BUY = "00 System/Data/Purchases.md";
const later = () => new Promise(r => setTimeout(r, 5));
// a vault in memory: its task notes in the store (done tasks earn gold) and Purchases' lines through a
// Dataview
const vault = (files = {}, records = {}) => {
  globalThis.window = { moment: () => ({ format: () => "2026-11-02" }) };
  const lines = prefix => Object.entries(files).filter(([p]) => p.startsWith(prefix)).flatMap(([, t]) => t.split("\n"))
    .filter(l => /^- /.test(l)).map(l => ({ text: l.replace(/^- /, "") }));

  if (Object.keys(records).length) files[RECORDS] = JSON.stringify(records, null, 2);
  for (const [p, text] of Object.entries(files)) if (p.startsWith("00 System/Data/Tasks/") && p !== RECORDS) taskStore.put(p, text);
  taskStore.putRecords(records);
  const app = {
    plugins: { plugins: { dataview: { api: { pages: src => ({ file: { lists: lines(src.slice(1, -1)) } }) } } } },
    vault: {
      getFileByPath: p => p in files ? { path: p } : null,
      getFolderByPath: () => ({}),
      getAbstractFileByPath: p => ({ path: p }),
      cachedRead: async f => files[f.path],
      // a write lands a moment later, like a real one (and Dataview sees it later still)
      process: async (f, fn) => { await later(); files[f.path] = fn(files[f.path]); },
      read: async f => files[f.path],
      create: async (p, text) => { await later(); files[p] = text; },
    },
  };
  setApp(app);
  return files;
};
// done tasks' records: their difficulty is their gold
const RECS = { t1: { difficulty: "medium" }, t2: { difficulty: "easy" }, t3: { difficulty: "epic" } };

test("a purchase is logged only when the gold covers it", async () => {
  const files = vault({ [MASTER]: "- [x] t1\n- [x] t2\n", [BUY]: "# Purchases\n\n- 2026-10-01 | Tea | 3\n" }, RECS);
  assert.equal(await logPurchase("Coffee", 5), false);   // 5 + 2 earned − 3 spent = 4
  assert.doesNotMatch(files[BUY], /Coffee/);
  assert.equal(await logPurchase("Candy", 4), true);
  assert.match(files[BUY], /- 2026-11-02 \| Candy \| 4\n$/);
});

test("a new task goes to the top of Master.md; none is made when Master.md is missing", async () => {
  const files = vault({ [MASTER]: "- [ ] old\n" });
  assert.equal(await addTask("- [ ] new"), true);
  assert.equal(files[MASTER], "- [ ] new\n- [ ] old\n");
  const none = vault({});
  assert.equal(await addTask("- [ ] new"), false);
  assert.deepEqual(none, {});
});

const json = (files) => JSON.parse(files[RECORDS]);

test("saveRecords merges a patch into a record, a missing file is made", async () => {
  const files = vault({});
  await saveRecords({ t1: { name: "walk", area: null } });
  assert.deepEqual(json(files), { t1: { name: "walk", area: null } });
  await saveRecords({ t1: { area: "body" }, t2: { name: "read" } });
  assert.equal(files[RECORDS], JSON.stringify({ t1: { name: "walk", area: "body" }, t2: { name: "read" } }, null, 2));

});

test("a new id is the biggest one plus one", () => {
  assert.equal(newId(new Map()), "t1");
  assert.equal(newId(new Map([["t2", {}], ["t10", {}]])), "t11");
  assert.equal(newId(new Map([["t2", {}], ["x", {}], ["tea", {}]])), "t3");
});

const PICK = { difficulty: "easy", area: "body", daytime: "evening", sticker: "a.webp" };

test("editing a task: the picks and the new name go to its record, its dates to its line", async () => {
  const rec = { name: "walk", difficulty: null, area: null, daytime: null, goal: null, sticker: null, after: null };
  const files = vault({ [MASTER]: "- [ ] t1 [due:: 2026-11-03]\n" }, { t1: rec });
  const item = taskStore.tasks[0];
  const read = await readTaskEdit(item);
  await saveTaskEdit(item, read, PICK, "- [ ] walk far [due:: 2026-11-05]");
  assert.deepEqual(json(files).t1, { ...rec, ...{ difficulty: "easy", area: "body", daytime: "evening", sticker: "a.webp" }, name: "walk far" });
  assert.equal(files[MASTER], "- [ ] t1 [due:: 2026-11-05]\n");
});

test("pool membership on an existing task preserves its scheduled and completed occurrences", async () => {
  const log = "- [ ] t1 [due:: 2026-11-20]\n- [x] t1 [completion:: 2026-11-13]\n";
  const files = vault({ [MASTER]: log }, { t1: { name: "cook soup" } });
  const item = taskStore.tasks[0];
  const edited = "- [ ] cook soup [due:: 2026-11-20]";
  for (const pool of [true, false]) {
    const read = await readTaskEdit(item);
    assert.equal(read.preset.pool, !pool);
    await saveTaskEdit(item, read, { ...read.preset, pool }, edited);
    assert.equal(!!json(files).t1.pool, pool);
    assert.equal(files[MASTER], log);
  }
});

test("renamed to another task's name: the record is renamed, the two ids stay", async () => {
  const files = vault({ [MASTER]: "- [ ] t1\n- [ ] t2\n" }, { t1: { name: "walk" }, t2: { name: "read" } });
  const item = taskStore.tasks[0];
  await saveTaskEdit(item, await readTaskEdit(item), PICK, "- [ ] read");
  assert.equal(json(files).t1.name, "read");
  assert.equal(json(files).t2.name, "read");
  assert.equal(files[MASTER], "- [ ] t1\n- [ ] t2\n");
});

test("a cancelled Tasks dialog writes nothing", async () => {
  const files = vault({ [MASTER]: "- [ ] t1\n" }, { t1: { name: "walk" } });
  const item = taskStore.tasks[0];
  await saveTaskEdit(item, await readTaskEdit(item), PICK, "");
  assert.deepEqual(json(files), { t1: { name: "walk" } });
});

test("the line changed while the dialogs were open: nothing saved, record and line as they were", async () => {
  const files = vault({ [MASTER]: "- [ ] t1 [due:: 2026-11-03]\n" }, { t1: { name: "walk" } });
  const item = taskStore.tasks[0];
  const read = await readTaskEdit(item);
  files[MASTER] = "- [x] t1 [due:: 2026-11-03]\n";
  await saveTaskEdit(item, read, PICK, "- [ ] walk far [due:: 2026-11-05]");
  assert.deepEqual(json(files), { t1: { name: "walk" } });
  assert.equal(files[MASTER], "- [x] t1 [due:: 2026-11-03]\n");
});

test("the 🔁 rule changed meanwhile, the date edited: line and record untouched", async () => {
  const files = vault({ [MASTER]: "- [ ] t1 [repeat:: every day] [due:: 2026-11-03]\n" }, { t1: { name: "walk" } });
  const item = taskStore.tasks[0];
  const read = await readTaskEdit(item);
  const meanwhile = "- [ ] t1 [repeat:: every week] [due:: 2026-11-03]\n";
  files[MASTER] = meanwhile;
  await saveTaskEdit(item, read, PICK, "- [ ] walk [repeat:: every day] [due:: 2026-11-05]");
  assert.equal(files[MASTER], meanwhile);
  assert.deepEqual(json(files), { t1: { name: "walk" } });
});

test("the line ticked meanwhile, only the picks changed: the record untouched", async () => {
  const files = vault({ [MASTER]: "- [ ] t1 [due:: 2026-11-03]\n" }, { t1: { name: "walk" } });
  const item = taskStore.tasks[0];
  const read = await readTaskEdit(item);
  files[MASTER] = "- [x] t1 [due:: 2026-11-03]\n";
  await saveTaskEdit(item, read, PICK, "- [ ] walk [due:: 2026-11-03]");
  assert.deepEqual(json(files), { t1: { name: "walk" } });
  assert.equal(files[MASTER], "- [x] t1 [due:: 2026-11-03]\n");
});

test("a pool item: the window's picks and name go to its record, no line", async () => {
  const files = vault({ [MASTER]: "- [ ] t2\n" }, { t1: { name: "water herbs", pool: true } });
  const item = taskStore.pool[0];
  const read = await readTaskEdit(item);
  assert.equal(read.preset.name, "water herbs");
  await saveTaskEdit(item, read, { ...PICK, name: "feed herbs" }, null);
  assert.deepEqual(json(files).t1, { name: "feed herbs", pool: true, difficulty: "easy", area: "body", daytime: "evening", sticker: "a.webp" });
  assert.equal(files[MASTER], "- [ ] t2\n");
});

test("a new task: a new name gets a new id, a past name its old one; the line goes on top", async () => {
  const files = vault({ [MASTER]: "- [ ] t4 [due:: 2026-11-03]\n" }, { t4: { name: "walk", goal: null } });
  assert.equal(await saveNewTask("stretch", PICK, "- [ ] stretch [created:: 2026-11-02] [due:: 2026-11-06]"), "t5");
  assert.equal(files[MASTER], "- [ ] t5 [created:: 2026-11-02] [due:: 2026-11-06]\n- [ ] t4 [due:: 2026-11-03]\n");
  assert.deepEqual(json(files).t5, { name: "stretch", difficulty: "easy", area: "body", daytime: "evening", goal: null, sticker: "a.webp", after: null });
  taskStore.putRecords(json(files));
  assert.equal(await saveNewTask("Walk ", PICK, "- [ ] Walk  [created:: 2026-11-02]", "t4"), "t4");
  assert.match(files[MASTER], /^- \[ \] t4 \[created:: 2026-11-02\]\n/);
  assert.equal(Object.keys(json(files)).length, 2);
});

test("a past task picked, its words changed in the Tasks dialog: a new task, the past one keeps its name", async () => {
  const files = vault({ [MASTER]: "- [ ] t4\n" }, { t4: { name: "walk", goal: null } });
  await saveNewTask("walk", PICK, "- [ ] walk the dog [created:: 2026-11-02]", "t4");
  assert.match(files[MASTER], /^- \[ \] t5 /);
  assert.equal(json(files).t4.name, "walk");
  assert.equal(json(files).t5.name, "walk the dog");
});

test("a new task typed with a name a record already has (no pick): reuses its id", async () => {
  const files = vault({ [MASTER]: "- [ ] t4\n" }, { t4: { name: "Walk", goal: null } });
  await saveNewTask("walk", PICK, "- [ ] walk [created:: 2026-11-02]");
  assert.match(files[MASTER], /^- \[ \] t4 \[created:: 2026-11-02\]\n/);
  assert.deepEqual(Object.keys(json(files)), ["t4"]);
});

test("a new task to the pool: a record with pool: true, no line", async () => {
  const files = vault({ [MASTER]: "- [ ] t1\n" });
  assert.equal(await saveNewTask("water herbs", { ...PICK, pool: true }, "- [ ] water herbs [created:: 2026-11-02]"), "t2");
  assert.deepEqual(json(files).t2.pool, true);   // t1 is taken by the line
  assert.equal(files[MASTER], "- [ ] t1\n");
});

test("a pool item dropped on a day: its id in a new open line", async () => {
  const files = vault({ [MASTER]: "- [ ] t9\n" }, { t1: { name: "water herbs", pool: true } });
  await makeActions({ today: "2026-11-02" }).fromPool(taskStore.pool[0], "2026-11-04", false);
  assert.equal(files[MASTER], "- [ ] t1 [created:: 2026-11-02] [due:: 2026-11-04]\n- [ ] t9\n");
});

test("a purchase's cost is the line's last number, not one in its name", async () => {
  const files = vault({ [MASTER]: "- [x] t1\n", [BUY]: "# Purchases\n\n- 2026-10-01 | 1984 | 2\n" }, RECS);
  assert.equal(await logPurchase("Candy", 3), true);   // 5 earned − 2 spent = 3
  assert.match(files[BUY], /Candy/);
});

test("two purchases at once: the second sees the first (10 gold, two for 10: one goes through)", async () => {
  const files = vault({ [MASTER]: "- [x] t1\n- [x] t1\n" }, RECS);
  const [one, two] = await Promise.all([logPurchase("Tea", 10), logPurchase("Cake", 10)]);
  assert.deepEqual([one, two], [true, false]);
  assert.doesNotMatch(files[BUY], /Cake/);
});

test("a purchase for 2.5 counts 2.5", async () => {
  const files = vault({ [MASTER]: "- [x] t1\n", [BUY]: "# Purchases\n\n- 2026-10-01 | Tea | 2.5\n" }, RECS);
  assert.equal(await logPurchase("Cake", 3), false);   // 5 − 2.5 = 2.5
  assert.equal(await logPurchase("Gum", 2.5), true);
  assert.match(files[BUY], /Gum \| 2\.5/);
});

test("a purchase for 1 000 (a space in it) counts 1000", async () => {
  vault({ [MASTER]: "- [x] t3\n", [BUY]: "# Purchases\n\n- 2026-10-01 | Tea | 1 000\n" }, RECS);
  assert.equal(await logPurchase("Gum", 1), false);   // 25 − 1000
});

test("a drop renumbers the day's group 0…n in the records", async () => {
  const day = "2026-11-02", recs = { t1: { name: "a" }, t2: { name: "b" }, t3: { name: "c" }, t4: { name: "d" } };
  const lines = ["t1", "t2", "t3", "t4 [repeat:: every day]"].map(l => `- [ ] ${l} [due:: ${day}]`);
  const files = vault({ [MASTER]: lines.join("\n") }, recs);
  const tasks = taskStore.tasks.map((t, i) => ({ ...t, line: i }));
  const model = new CalendarData({ tasks, poolLines: [], days: [day], today: day, areaOrder: [] });
  await makeActions({ today: day, model }).reorder(tasks[2], tasks[0], false, day);   // c before a
  assert.deepEqual(Object.fromEntries(Object.entries(json(files)).map(([k, r]) => [k, r.order])),
    { t1: 1, t2: 2, t3: 0, t4: undefined });
});

test("a drop on a task outside the group does nothing", async () => {
  const day = "2026-11-02", recs = { t1: { name: "a" }, t2: { name: "b" }, t3: { name: "c" } };
  const lines = ["t1", "t2", "t3 [repeat:: every day]"].map(l => `- [ ] ${l} [due:: ${day}]`);
  const files = vault({ [MASTER]: lines.join("\n") }, recs);
  const tasks = taskStore.tasks.map((t, i) => ({ ...t, line: i }));
  const model = new CalendarData({ tasks, poolLines: [], days: [day], today: day, areaOrder: [] });
  const before = files[RECORDS];
  await makeActions({ today: day, model }).reorder(tasks[0], tasks[2], false, day);
  assert.equal(files[RECORDS], before);
});

test("a tasks.json that isn't valid JSON: New task says so and saves nothing", async () => {
  const files = vault({ [MASTER]: "- [ ] t1\n", [RECORDS]: "{oops" });
  await saveNewTask("stretch", PICK, "- [ ] stretch [created:: 2026-11-02]");
  assert.match(Notice.last, /tasks\.json isn't valid JSON — task not saved/);
  assert.equal(files[MASTER], "- [ ] t1\n");
  assert.equal(files[RECORDS], "{oops");
});

test("a 🔁 task set to done in the Tasks dialog: both lines get the id, the name stays clean", async () => {
  const files = vault({ [MASTER]: "- [ ] t1 [repeat:: every day] [due:: 2026-11-02]\n" }, { t1: { name: "walk" } });
  const item = taskStore.tasks[0];
  const edited = "- [ ] walk [repeat:: every day] [due:: 2026-11-03]\n"
    + "- [x] walk [repeat:: every day] [due:: 2026-11-02] [completion:: 2026-11-02]";
  await saveTaskEdit(item, await readTaskEdit(item), PICK, edited);
  assert.equal(json(files).t1.name, "walk");
  assert.equal(files[MASTER], "- [ ] t1 [repeat:: every day] [due:: 2026-11-03]\n"
    + "- [x] t1 [repeat:: every day] [due:: 2026-11-02] [completion:: 2026-11-02]\n");
});

test("a new id skips the ids of lines whose record is gone (lost to a sync conflict)", async () => {
  const files = vault({ [MASTER]: "- [ ] t7\n" }, { t1: { name: "walk" } });
  await saveNewTask("stretch", PICK, "- [ ] stretch [created:: 2026-11-02]");
  assert.match(files[MASTER], /^- \[ \] t8 /);
});

test("two new tasks saved at once: two ids, two lines, two records", async () => {
  const files = vault({ [MASTER]: "" });
  await Promise.all([
    saveNewTask("stretch", PICK, "- [ ] stretch [created:: 2026-11-02]"),
    saveNewTask("read", PICK, "- [ ] read [created:: 2026-11-02]"),
  ]);
  assert.equal(files[MASTER], "- [ ] t2 [created:: 2026-11-02]\n- [ ] t1 [created:: 2026-11-02]\n");
  assert.deepEqual(Object.entries(json(files)).map(([id, r]) => [id, r.name]), [["t1", "stretch"], ["t2", "read"]]);
});

// the notices' texts, and their Undo buttons (a document just big enough for undoNotice)
const notices = () => {
  const parts = [];
  globalThis.document = {
    createDocumentFragment: () => ({ append: (...x) => parts.push(...x), appendChild: el => (parts.push(el), el) }),
    createElement: () => ({}),
  };
  return parts;
};

test("the undo notice names the task, not its id", async () => {
  const parts = notices();
  vault({ [MASTER]: "- [ ] t1\n" }, { t1: { name: "walk" } });
  await makeActions({ today: "2026-11-02" }).remove({ ...taskStore.tasks[0], line: 0 });
  assert.equal(parts[0], "🗑 walk  ");
  delete globalThis.document;
});

test("🗑 on a pool card: out of the pool, its record and history kept; undo puts it back", async () => {
  const parts = notices();
  const files = vault({ [MASTER]: "- [x] t1\n" }, { t1: { name: "water herbs", pool: true } });
  await makeActions({ today: "2026-11-02" }).remove(taskStore.pool[0]);
  assert.deepEqual(json(files), { t1: { name: "water herbs" } });
  assert.equal(files[MASTER], "- [x] t1\n");
  assert.equal(parts[0], "🗑 water herbs  ");
  await parts[1].onclick();
  assert.deepEqual(json(files), { t1: { name: "water herbs", pool: true } });
  delete globalThis.document;
});

test("Missed? completes on its own day; Undo restores the original recurring task", async () => {
  const parts = notices();
  try {
    const seen = [], day = "2026-11-01";
    const before = `- [ ] t1 [repeat:: every day] [due:: ${day}]\n`;
    const files = vault({ [MASTER]: before }, { t1: { name: "walk" } });
    const t = { ...taskStore.tasks[0], line: 0 };
    const TASKS = { executeToggleTaskDoneCommand(line, path) {
      seen.push(path);
      return line.replace("2026-11-01", "2026-11-03") + "\n"
        + line.replace("[ ]", "[x]") + " [completion:: 2026-11-02]";
    } };
    await makeActions({ today: "2026-11-02", TASKS }).doneOnItsDay(t);
    assert.deepEqual(seen, [MASTER]);
    assert.ok(files[MASTER].includes(`[completion:: ${day}]`));
    assert.equal(parts[1].textContent, "Undo");
    await parts[1].onclick();
    assert.equal(files[MASTER], before);
  } finally { delete globalThis.document; }
});
