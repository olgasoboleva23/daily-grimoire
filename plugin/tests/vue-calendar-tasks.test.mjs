import "./stubs/dom.mjs";
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { MASTER, STICKERS, TASK_RECORDS } from "#/shared/config/index.js";
import { vault } from "./stubs/vault.mjs";

// A task as the calendar draws it (TaskText, TaskRow, TaskCard): draggable, its checkbox, its buttons
let mount, TaskText, TaskRow, TaskCard;
before(async () => {
  ({ mount } = await import("@vue/test-utils"));
  // a component is <Name>.vue, or <Name>/index.vue when it has its own styles
  const load = async n => (await import(`../src/components/pages/calendar/${n}`)).default;
  [TaskText, TaskRow, TaskCard] = await Promise.all(["TaskText.vue", "TaskRow.vue", "TaskCard/index.vue"].map(load));
});
const info = over => ({ key: "k7", area: "body", difficulty: "medium", text: "walk <fast>", label: "🌺 walk <fast>",
  sticker: "app://x/levi.png", canSkip: false, ...over });
const global = { provide: { calendar: { task: () => null, ctx: { TASKS: {} } } } };
const html = (C, props) => mount(C, { props, global }).html({ raw: true }).replace(/<!--[^]*?-->/g, "");

test("TaskText: stars (none without a difficulty), the text, the sticker", () => {
  assert.equal(mount({ components: { TaskText }, template: "<div><TaskText :task='t' /></div>", data: () => ({ t: info() }) })
    .element.innerHTML.replace(/<!--[^]*?-->/g, ""),
    '<span class="tag" data-difficulty="medium" aria-label="difficulty" data-tip="ui-tooltip"></span> walk &lt;fast&gt; ' +
    '<img class="ui-cal__sticker" src="app://x/levi.png" alt="">');
});

test("TaskText: 🌅 / 🌙 before a one-off's label", () => {
  const t = time => mount(TaskText, { props: { task: info({ daytime: time }), withIcon: true } }).text();
  assert.equal(t("morning"), "🌅 🌺 walk <fast>");
  assert.equal(t("evening"), "🌙 🌺 walk <fast>");
  assert.equal(t(null), "🌺 walk <fast>");
});

test("TaskRow: a day's row — checkbox in the week, 🔁 for a repeat, buttons for an open one", () => {
  const open = html(TaskRow, { task: info({ canSkip: true }), kind: "open", tick: true });
  assert.match(open, /^<div class="ui-cal__task ui-cal__task--open"[^>]* data-area="body"[^>]* draggable="true">/);
  assert.match(open, /<input type="checkbox" class="task-list-item-checkbox" aria-label="done">/);
  assert.match(open, /<button class="ui-btn ui-btn--round ui-task__btns-skip" aria-label="skip this time" data-tip="ui-tooltip">⏭<\/button>/);
  const ghost = html(TaskRow, { task: info(), kind: "ghost", tick: true });
  assert.match(ghost, /^<div class="ui-cal__task ui-cal__task--ghost"[^>]* data-area="body"><div class="ui-task__content">🔁 <span class="tag"/);
  assert.doesNotMatch(ghost, /checkbox|ui-task__btns|draggable/);
  const month = html(TaskRow, { task: info(), kind: "open", compact: true, tick: true });
  assert.match(month, / aria-label="🌺 walk <fast>"/);   // the tooltip; the DOM writes "<" as it is in an attribute
  assert.doesNotMatch(month, /checkbox|ui-task__btns/);
  const after = html(TaskRow, { task: info(), kind: "open", tick: true, after: true });
  assert.match(after, /draggable="true"><div class="ui-task__content"><span class="ui-cal__after">↳<\/span><input type="checkbox"/);
  // a goal's task: its row says so (the tick plays the goal's sound)
  assert.match(html(TaskRow, { task: info({ goal: true }), kind: "open", tick: true }), /^<div class="ui-cal__task ui-cal__task--open"[^>]* data-area="body" data-goal="true"/);
});

test("TaskCard: a panel card, its meta line, its buttons (a pool item: add to today, edit, delete)", () => {
  const card = html(TaskCard, { task: info({ canSkip: true }), meta: "waiting 3 d" });
  assert.match(card, /^<div class="ui-task-card"[^>]* data-area="body"[^>]* draggable="true"><div class="ui-task-card__text ui-task__content"><span class="tag"/);
  assert.match(card, /<div class="ui-task-card__meta ui-task__content">waiting 3 d<\/div><div class="ui-task__btns ui-task__actions">/);
  const pool = html(TaskCard, { task: info({ pool: true }), meta: "never done" });
  assert.match(pool, /aria-label="edit pool task"/);
  assert.match(pool, /aria-label="add to today"/);
  assert.doesNotMatch(pool, /skip this time/);
});

test("the calendar pencil opens Edit task, then passes the named line to Tasks", async () => {
  const { testWindows } = await import("./stubs/windows.mjs");
  const { flushPromises } = await import("@vue/test-utils");
  const { taskStore } = await import("#/store/tasks.js");
  const { makeActions } = await import("#/controllers/calendar.js");
  const line = "- [ ] t1 [due:: 2026-11-11]";
  const records = { t1: { name: "Walk", area: "body" } };
  const { app, files } = vault({
    [MASTER]: line, [TASK_RECORDS]: JSON.stringify(records), [`${STICKERS}/leaf.webp`]: "",
  });
  app.vault.getResourcePath = file => `app://x/${file.name}`;
  taskStore.put(MASTER, line);
  taskStore.putRecords(records);
  const asked = [];
  const TASKS = { editTaskLineModal: async l => {
    asked.push(l);
    return "- [ ] Walk outside [due:: 2026-11-12]";
  } };
  app.plugins.plugins["obsidian-tasks-plugin"] = { apiV1: TASKS };
  const ctx = { TASKS };
  const calendar = { task: () => taskStore.tasks[0], ctx, actions: makeActions(ctx) };
  const windows = testWindows();
  const row = mount(TaskRow, {
    props: { task: info(), kind: "open" }, global: { provide: { calendar } },
  });

  try {
    await row.get(".ui-task__btns-edit").trigger("click");
    await flushPromises();
    assert.equal(windows.all.length, 1);
    const [w] = windows.all;
    assert.equal(w.title, "✦ Edit task");
    const sticker = w.wrapper.get('button[title="leaf.webp"]');
    assert.equal(sticker.get("img").attributes("src"), "app://x/leaf.webp");
    await sticker.trigger("click");
    await w.submit();
    assert.deepEqual(asked, ["- [ ] Walk [due:: 2026-11-11]"]);
    assert.equal(files[MASTER], "- [ ] t1 [due:: 2026-11-12]");
    const stored = JSON.parse(files[TASK_RECORDS]).t1;
    assert.equal(stored.name, "Walk outside");
    assert.equal(stored.sticker, "leaf.webp");
  } finally { windows.restore(); row.unmount(); }
});

test("the Pool pencil opens Name and Save and updates the record directly", async () => {
  const { testWindows } = await import("./stubs/windows.mjs");
  const { flushPromises } = await import("@vue/test-utils");
  const records = { t1: { name: "Water herbs", pool: true } };
  const { files } = vault({ [TASK_RECORDS]: JSON.stringify(records) });
  const task = { id: "t1", pool: true, rec: records.t1 };
  const calendar = { task: () => task, ctx: { TASKS: null } };
  const windows = testWindows();
  const card = mount(TaskCard, {
    props: { task: info({ pool: true }) }, global: { provide: { calendar } },
  });

  try {
    await card.get('[aria-label="edit pool task"]').trigger("click");
    await flushPromises();
    assert.equal(windows.all.length, 1);
    const [w] = windows.all;
    assert.equal(w.title, "✦ Edit task");
    assert.equal(w.wrapper.get(".ui-window__submit").text(), "Save");
    const name = w.wrapper.get('input[placeholder="name"]');
    assert.equal(name.element.value, "Water herbs");
    await name.setValue("Feed herbs");
    await w.submit();
    assert.equal(JSON.parse(files[TASK_RECORDS]).t1.name, "Feed herbs");
  } finally { windows.restore(); card.unmount(); }
});
