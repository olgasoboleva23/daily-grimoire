import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Menu } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import { PROJECTS } from "#/helpers/paths.js";

// The Projects tab: its list of project cards (cover, status, description, progress, the next task)
// and a project's page (header, stages, task rows, Result and Notes)
const MASTER = "00 System/Data/Tasks/Master.md";
const RECORDS = "00 System/Data/Tasks/tasks.json";
let vue, Projects, taskStore, Form, Search, files, app;
before(async () => {
  GlobalRegistrator.register();
  window.moment = () => ({ format: () => "2026-11-12" });
  vue = await import("vue");
  ({ Form } = await import("#/components/uikit/Form/index.ts"));
  ({ Search } = await import("#/components/uikit/Search/index.ts"));
  ({ taskStore } = await import("#/store/tasks.js"));
  Projects = (await import("#/components/pages/projects/index.vue")).default;
});

// made-up projects: Garden (3 of 8 done, its first stage complete), Shed (no stages), Poem, Kite
beforeEach(() => {
  const master = ["- [x] t1", "- [x] t2", "- [x] t3", "- [ ] t4", "- [ ] t5", "- [ ] t6", "- [ ] t7", "- [ ] t8"].join("\n");
  const records = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(i => [`t${i}`, { name: `step ${i}` }]));
  const projects = {
    p1: { name: "Garden", status: "active", description: "beds by the wall", cover: null,
      result: "a full basket", notes: "water at dawn",
      stages: [{ name: "A", tasks: ["t1", "t2", "t3"] }, { name: "B", tasks: ["t4", "t5", "t6", "t7", "t8"] }] },
    p2: { name: "Shed", status: "paused", description: "", cover: "Media/shed.webp", stages: [] },
    p3: { name: "Poem", status: "idea", description: "", cover: null, stages: [] },
    p4: { name: "Kite", status: "done", description: "", cover: null, stages: [] },
  };
  ({ files, app } = vault({
    [MASTER]: master, [RECORDS]: JSON.stringify(records), [PROJECTS]: JSON.stringify(projects), "Media/shed.webp": "",
  }));
  app.vault.getResourcePath = f => `app://x/${f.path}`;
  taskStore.put(MASTER, master);
  taskStore.putRecords(records);
  taskStore.putProjects(projects);
});

function mount(over = {}) {
  const view = {
    state: vue.reactive({ open: null, filter: "all", ...over }), version: vue.ref(0),
    open: k => { view.state.open = k; },
  };
  const el = document.body.appendChild(document.createElement("div"));
  vue.createApp(Projects, { state: view.state }).provide("ui", {
    go: (_page, params, e) => view.open(params.open, e),
  }).mount(el);
  return { el, view };
}
const cards = el => [...el.querySelectorAll(".ui-projects__card")];
const names = el => cards(el).map(c => c.querySelector(".ui-card__title-inner").textContent);

test("the list: a card per project in file order with its status pill, description, 3/8 and the next task", () => {
  const { el } = mount();
  assert.deepEqual(names(el), ["Garden", "Shed", "Poem", "Kite"]);
  const garden = cards(el)[0];
  assert.equal(garden.querySelector(".ui-status").className, "ui-status ui-status--active");
  assert.equal(garden.querySelector(".ui-status").textContent, "Active");
  assert.equal(garden.querySelector(".ui-projects__description").textContent, "beds by the wall");
  const bar = garden.querySelector("progress.ui-progress__bar");
  assert.equal([bar.value, bar.max].join("/"), "3/8");
  assert.equal(garden.querySelector(".ui-progress__count").textContent, "3/8");
  assert.ok(garden.querySelector(".ui-projects__next .ui-check"));
  assert.equal(garden.querySelector(".ui-projects__next-text").textContent, "step 4");
  assert.equal(el.querySelector(".ui-tabs").textContent, "All · 4Idea · 1Active · 1Paused · 1Done · 1");
});

test("Filter Paused shows only paused projects; All shows every status, Idea and Done too", async () => {
  const { el, view } = mount({ filter: "paused" });
  assert.deepEqual(names(el), ["Shed"]);
  [...el.querySelectorAll(".ui-tabs__tab")].find(b => b.dataset.tab === "all").click();
  await vue.nextTick();
  assert.equal(view.state.filter, "all");
  assert.deepEqual(names(el), ["Garden", "Shed", "Poem", "Kite"]);
});

test("A project with no tasks has no progress bar", () => {
  const shed = cards(mount().el)[1];
  assert.equal(shed.querySelector(".ui-progress"), null);
  assert.equal(shed.querySelector(".ui-projects__next"), null);
});

test("No cover: a block with the word project; a cover: its picture", () => {
  const [garden, shed] = cards(mount().el);
  const block = garden.querySelector(".ui-card__cover--empty");
  assert.equal(block.textContent, "project");
  assert.equal(garden.querySelector("img.ui-card__cover"), null);
  assert.equal(shed.querySelector("img.ui-card__cover").getAttribute("src"), "app://x/Media/shed.webp");
  assert.equal(shed.querySelector(".ui-card__cover--empty"), null);
});

test("a project page: stage buttons, the Links card with its links", () => {
  taskStore.putProjects({ p1: { name: "Garden", status: "active", cover: null,
    links: [{ title: "Seeds", url: "https://example.com/s" }], stages: [{ name: "A", tasks: [] }] } });
  const el = mount({ open: "p1" }).el;
  assert.ok(el.querySelector(".ui-project__stage [aria-label=rename]"));
  assert.ok(el.querySelector(".ui-project__stage [aria-label=delete]"));
  const a = el.querySelector(".ui-project__links a");
  assert.equal([a.textContent, a.getAttribute("href"), a.target].join(" "), "Seeds https://example.com/s _blank");
  assert.equal(el.querySelector(".ui-project__header .ui-card__cover--empty").textContent, "project");
});

test("a project without links field has a Links card with + link only", () => {
  const el = mount({ open: "p1" }).el;
  assert.equal(el.querySelectorAll(".ui-project__links a").length, 0);
  assert.match(el.querySelector(".ui-project__links").textContent, /\+ link/);
});

test("Clicking a card sets state.open", () => {
  const { el, view } = mount();
  cards(el)[1].click();
  assert.equal(view.state.open, "p2");
});

test("a project card opens through projects.open (the router's step later)", async () => {
  const { el, view } = mount();
  const opened = [], open = view.open;
  view.open = (k, e) => { opened.push(k); assert.ok(e instanceof MouseEvent); open(k); };
  cards(el)[0].click();
  await vue.nextTick();
  assert.deepEqual(opened, ["p1"]);
  assert.ok(el.querySelector(".ui-project"));
  el.querySelector(".ui-project__back").click();
  await vue.nextTick();
  assert.deepEqual(opened, ["p1", null]);
  assert.deepEqual(names(el), ["Garden", "Shed", "Poem", "Kite"]);
});

test("An open key in the store shows its page; one that isn't shows the list", () => {
  const page = mount({ open: "p1" }).el;
  assert.ok(page.querySelector(".ui-project"));
  assert.equal(page.querySelector(".ui-projects"), null);
  const list = mount({ open: "p9" }).el;
  assert.equal(list.querySelector(".ui-project"), null);
  assert.deepEqual(names(list), ["Garden", "Shed", "Poem", "Kite"]);
});

test("No projects: UiEmpty 'No projects yet'", () => {
  taskStore.putProjects({});
  const { el } = mount();
  assert.equal(el.querySelector(".ui-empty").textContent, "✦ No projects yet");
});

test("A filter that matches nothing shows UiEmpty 'No <status> projects'", () => {
  const { el } = mount({ filter: "paused" });
  assert.equal(el.querySelector(".ui-empty"), null);
  taskStore.putProjects({ p3: { name: "Poem", status: "idea", stages: [] } });
  const none = mount({ filter: "paused" }).el;
  assert.equal(none.querySelector(".ui-empty").textContent, "✦ No paused projects");
  assert.deepEqual(names(none), []);
});

// the project's page
const saved = () => JSON.parse(files[PROJECTS]).p1;
const until = async ok => { for (let i = 0; i < 50 && !ok(); i++) await new Promise(r => setTimeout(r, 2)); };
const stages = el => [...el.querySelectorAll(".ui-project__stage")];
const texts = (el, sel) => [...el.querySelectorAll(sel)].map(e => e.textContent.trim());
const button = (el, label) => [...el.querySelectorAll("button")].find(b => b.textContent.trim() === label);

test("the header: the name, status, description, 3/8; ← Projects clears state.open", async () => {
  const { el, view } = mount({ open: "p1" });
  const header = el.querySelector(".ui-project__header");
  assert.equal(header.querySelector(".ui-card__title-inner").textContent, "Garden");
  assert.equal(header.querySelector(".ui-status").textContent, "Active");
  assert.equal(header.querySelector(".ui-project__description").textContent, "beds by the wall");
  assert.equal(header.querySelector(".ui-progress__count").textContent, "3/8");
  button(el, "← Projects").click();
  assert.equal(view.state.open, null);
});

test("the status pill: a menu of the four statuses, a pick saves it", async () => {
  const { el } = mount({ open: "p1" });
  el.querySelector(".ui-project__status").click();
  assert.deepEqual(Menu.last.items.map(i => i.title), ["Idea", "Active", "Paused", "Done"]);
  assert.deepEqual(Menu.last.items.map(i => i.checked), [false, true, false, false]);
  Menu.last.items[2].click();
  await until(() => saved().status === "paused");
  assert.equal(saved().status, "paused");
});

test("stages numbered 01, 02 with done/total; a complete stage starts folded and shows ✓", async () => {
  const { el } = mount({ open: "p1" });
  assert.deepEqual(texts(el, ".ui-project__stage-num"), ["01", "02"]);
  assert.deepEqual(texts(el, ".ui-project__stage-name"), ["A", "B"]);
  assert.deepEqual(texts(el, ".ui-project__stage-count"), ["3/3", "0/5"]);
  const [a, b] = stages(el);
  assert.ok(a.querySelector(".ui-project__stage-done"));
  assert.equal(b.querySelector(".ui-project__stage-done"), null);
  assert.equal(a.querySelectorAll(".ui-project__task").length, 0);
  assert.equal(b.querySelectorAll(".ui-project__task").length, 5);
  a.querySelector(".ui-project__fold").click();
  await vue.nextTick();
  assert.equal(a.querySelectorAll(".ui-project__task").length, 3);
});

test("a task row: checkbox (✅ static when done), TaskText, ✏️ and 📅 on open ones", async () => {
  const { el } = mount({ open: "p1" });
  const [a, b] = stages(el);
  a.querySelector(".ui-project__fold").click();
  await vue.nextTick();
  const done = a.querySelector(".ui-project__task"), open = b.querySelector(".ui-project__task");
  assert.equal(done.querySelector(".ui-check").tagName, "SPAN");
  assert.equal(done.querySelector(".ui-check").dataset.mark, "✅");
  assert.match(done.textContent, /step 1/);
  assert.equal(done.querySelector("button"), null);
  assert.equal(open.querySelector(".ui-check").dataset.mark, "☐");
  assert.match(open.textContent, /step 4/);
  assert.deepEqual([...open.querySelectorAll(".ui-btn")].map(x => x.textContent), ["✏️", "📅"]);
  assert.equal(open.querySelector("input.ui-project__date").type, "date");
  open.querySelectorAll(".ui-btn")[1].click();
  assert.deepEqual(Menu.last.items.map(i => i.title), ["Today", "Tomorrow", "Pick a date…"]);
});

test("+ task calls addToStage with the project key, the stage's index and name", async () => {
  const pick = Search.pickGrouped;
  Search.pickGrouped = async () => ({ name: "step 9", isNew: false, picks: { difficulty: "easy", area: "body" } });
  app.plugins.plugins["obsidian-tasks-plugin"] = { apiV1: { editTaskLineModal: async () => "- [ ] step 9" } };
  try {
    const { el } = mount({ open: "p1" });
    button(stages(el)[1], "+ task").click();
    await until(() => saved().stages[1].tasks.includes("t9"));
    assert.deepEqual(saved().stages[1].tasks, ["t4", "t5", "t6", "t7", "t8", "t9"]);
    assert.deepEqual(saved().stages[0].tasks, ["t1", "t2", "t3"]);
  } finally { Search.pickGrouped = pick; }
});

test("+ stage submits its name to addStage", async () => {
  const { el } = mount({ open: "p1" });
  const input = el.querySelector(".ui-project .ui-add-form__input");
  input.value = "Harvest";
  input.dispatchEvent(new Event("input"));
  await vue.nextTick();
  el.querySelector(".ui-project .ui-add-form__submit").click();
  await until(() => saved().stages.length === 3);
  assert.deepEqual(saved().stages[2], { id: "st1", name: "Harvest", tasks: [] });
});

test("Result and Notes show their text; Edit opens a Form with one lines row and saves the field", async () => {
  const ask = Form.ask;
  let asked;
  Form.ask = async (...args) => { asked = args; return { notes: "water at dusk" }; };
  try {
    const { el } = mount({ open: "p1" });
    assert.equal(el.querySelector(".ui-project__result .ui-project__text").textContent, "a full basket");
    const notes = el.querySelector(".ui-project__notes");
    assert.equal(notes.querySelector(".ui-project__text").textContent, "water at dawn");
    button(notes, "Edit").click();
    await until(() => saved().notes === "water at dusk");
    assert.deepEqual(asked.slice(1), [
      "✦ Notes", [{ name: "Notes", key: "notes", text: "", lines: true }], { values: { notes: "water at dawn" }, submit: "Save" },
    ]);
    assert.equal(saved().notes, "water at dusk");
    assert.equal(saved().result, "a full basket");
  } finally { Form.ask = ask; }
});

test("Edit when the project is removed while the Form is open writes nothing and does not throw", async () => {
  const ask = Form.ask;
  Form.ask = async () => { taskStore.putProjects({}); files[PROJECTS] = "{}"; return { notes: "late" }; };
  try {
    const { el } = mount({ open: "p1" });
    button(el.querySelector(".ui-project__notes"), "Edit").click();
    await new Promise(r => setTimeout(r, 30));
    assert.equal(files[PROJECTS], "{}");
  } finally { Form.ask = ask; }
});

test("Edit project opens the shared form; Delete cancels or returns to the list on confirmation", async () => {
  const ask = Form.ask;
  try {
    const { el, view } = mount({ open: "p1" });
    Form.ask = async () => ({ name: "Green garden", description: "New beds" });
    button(el, "Edit project").click();
    await until(() => saved().name === "Green garden");
    assert.equal(saved().name, "Green garden");
    assert.equal(saved().stages.length, 2);
    Form.ask = async () => null;
    button(el, "Delete project").click();
    await new Promise(r => setTimeout(r, 10));
    assert.equal(view.state.open, "p1");
    assert.ok(saved());
    Form.ask = async () => ({});
    button(el, "Delete project").click();
    await until(() => view.state.open === null);
    assert.equal(view.state.open, null);
    assert.equal(saved(), undefined);
    taskStore.putProjects(JSON.parse(files[PROJECTS]));
    await vue.nextTick();
    assert.deepEqual(names(el), ["Shed", "Poem", "Kite"]);
  } finally { Form.ask = ask; }
});
