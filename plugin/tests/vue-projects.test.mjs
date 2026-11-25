import "./stubs/dom.mjs";
import { projectStore } from "#/entities/project/index.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Menu, Notice } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import { CONFIG, PROJECTS } from "#/shared/config/index.js";

// The Projects tab: its list of project cards (cover, status, description, progress, the next task)
// and a project's page (header, stages, task rows, Result and Notes), and the windows their
// buttons open
const MASTER = "00 System/Data/Tasks/Master.md";
const RECORDS = "00 System/Data/Tasks/tasks.json";
let vue, Projects, taskStore, config, PROMPT_VARIABLES, Search, testWindows, files, app;
before(async () => {
  window.moment = () => ({ format: () => "2026-11-12" });
  vue = await import("vue");
  ({ testWindows } = await import("./stubs/windows.mjs"));
  config = (await import("#/shared/config/index.js")).default;
  ({ PROMPT_VARIABLES } = await import("#/controllers/prompts.js"));
  ({ Search } = await import("#/shared/ui/Search/index.ts"));
  ({ taskStore } = await import("#/entities/task/index.js"));
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
  projectStore.putProjects(projects);
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
  projectStore.putProjects({ p1: { name: "Garden", status: "active", cover: null,
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
  projectStore.putProjects({});
  const { el } = mount();
  assert.equal(el.querySelector(".ui-empty").textContent, "✦ No projects yet");
});

test("A filter that matches nothing shows UiEmpty 'No <status> projects'", () => {
  const { el } = mount({ filter: "paused" });
  assert.equal(el.querySelector(".ui-empty"), null);
  projectStore.putProjects({ p3: { name: "Poem", status: "idea", stages: [] } });
  const none = mount({ filter: "paused" }).el;
  assert.equal(none.querySelector(".ui-empty").textContent, "✦ No paused projects");
  assert.deepEqual(names(none), []);
});

// the project's page
const saved = () => JSON.parse(files[PROJECTS]).p1;
const until = async ok => { for (let i = 0; i < 50 && !ok(); i++) await new Promise(r => setTimeout(r, 2)); };
const stages = el => [...el.querySelectorAll(".ui-project__stage")];
const texts = (el, sel) => [...el.querySelectorAll(sel)].map(e => e.textContent.trim());
const KEPT = "Journal entries are deleted. Tasks, calendar and history stay.";
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

test("+ task reuses an existing task's picks and attaches the saved ID to the stage", async () => {
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

test("+ task opens New task for a new name and needs difficulty and area", async t => {
  const windows = testWindows();
  t.mock.method(Search, "pickGrouped", async () => ({ name: "Harvest", isNew: true }));
  const native = [];
  app.plugins.plugins["obsidian-tasks-plugin"] = { apiV1: { editTaskLineModal: async l => {
    native.push(l);
    return l;
  } } };

  try {
    const { el } = mount({ open: "p1" });
    button(stages(el)[1], "+ task").click();
    await until(() => windows.all.length);
    assert.equal(windows.all.length, 1);
    const [w] = windows.all;
    const submit = w.wrapper.get(".ui-window__submit");
    const fields = w.wrapper.findAll(".ui-field");
    const choices = name => fields.find(f => f.get(".setting-item-name").text() === name);

    assert.equal(w.title, "✦ New task");
    assert.equal(submit.text(), "Next →");
    assert.equal(submit.element.disabled, true);
    await choices("Difficulty").get('button[title*="Easy"]').trigger("click");
    assert.equal(submit.element.disabled, true);
    await choices("Area").get('button[title*="Body"]').trigger("click");
    assert.equal(submit.element.disabled, false);
    assert.deepEqual(native, []);
    await w.submit();
    await until(() => saved().stages[1].tasks.includes("t9"));
    assert.deepEqual(native, ["- [ ] Harvest [created:: 2026-11-12]"]);
    assert.equal(JSON.parse(files[RECORDS]).t9.name, "Harvest");
    assert.deepEqual(saved().stages[1].tasks, ["t4", "t5", "t6", "t7", "t8", "t9"]);
  } finally { windows.restore(); }
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

test("Result and Notes show their text; Edit asks in ✦ Notes (lines), saves it", async () => {
  const windows = testWindows();
  try {
    const { el } = mount({ open: "p1" });
    assert.equal(el.querySelector(".ui-project__result .ui-project__text").textContent, "a full basket");
    const notes = el.querySelector(".ui-project__notes");
    assert.equal(notes.querySelector(".ui-project__text").textContent, "water at dawn");
    button(notes, "Edit").click();
    const w = await windows.next();
    assert.deepEqual(w.props, { title: "✦ Notes", name: "Notes", type: "lines",
      value: "water at dawn", submit: "Save" });
    await w.wrapper.find("textarea").setValue("water at dusk\n");
    await w.submit();
    await until(() => saved().notes === "water at dusk\n");
    assert.equal(saved().notes, "water at dusk\n");
    assert.equal(saved().result, "a full basket");
    button(el.querySelector(".ui-project__result"), "Edit").click();
    const r = await windows.next();
    assert.equal(r.props.title, "✦ Result");
    await r.close();
    assert.equal(saved().result, "a full basket");
  } finally { windows.restore(); }
});

test("Edit of a project removed while its window is open writes nothing, no throw", async () => {
  const windows = testWindows();
  try {
    const { el } = mount({ open: "p1" });
    button(el.querySelector(".ui-project__notes"), "Edit").click();
    const w = await windows.next();
    projectStore.putProjects({}); files[PROJECTS] = "{}";
    await w.wrapper.find("textarea").setValue("late");
    await w.submit();
    await new Promise(r => setTimeout(r, 30));
    assert.equal(files[PROJECTS], "{}");
  } finally { windows.restore(); }
});

test("stage ✏️ asks the new name in ✦ Rename stage, saves it; closed: nothing", async () => {
  const windows = testWindows();
  try {
    const { el } = mount({ open: "p1" });
    stages(el)[1].querySelector("[aria-label=rename]").click();
    const w = await windows.next();
    assert.deepEqual(w.props, { title: "✦ Rename stage", name: "Name", value: "B", required: true,
      submit: "Save" });
    await w.wrapper.find("input").setValue(" Planting ");
    await w.submit();
    await until(() => saved().stages[1].name === "Planting");
    assert.deepEqual(saved().stages.map(s => s.name), ["A", "Planting"]);
    const before = files[PROJECTS];
    stages(el)[0].querySelector("[aria-label=rename]").click();
    await (await windows.next()).close();
    await new Promise(r => setTimeout(r, 10));
    assert.equal(files[PROJECTS], before);
  } finally { windows.restore(); }
});

test("Delete project? names the project and what is kept; closed it stays, else back", async () => {
  const windows = testWindows();
  try {
    const shed = mount({ open: "p2" });
    button(shed.el, "Delete project").click();
    const s = await windows.next();
    assert.deepEqual(s.props, { title: "Delete project?", submit: "Delete", lines: [
      { name: "Project", text: "Shed" },
      { name: "Kept", text: `${KEPT} The cover goes to the trash.` },
    ] });
    await s.close();
    await new Promise(r => setTimeout(r, 10));
    assert.equal(shed.view.state.open, "p2");
    assert.ok(JSON.parse(files[PROJECTS]).p2);

    const { el, view } = mount({ open: "p1" });
    button(el, "Delete project").click();
    const w = await windows.next();
    assert.equal(w.props.lines[1].text, KEPT);
    await w.submit();
    await until(() => view.state.open === null);
    assert.equal(view.state.open, null);
    assert.equal(saved(), undefined);
    projectStore.putProjects(JSON.parse(files[PROJECTS]));
    await vue.nextTick();
    assert.deepEqual(names(el), ["Shed", "Poem", "Kite"]);
  } finally { windows.restore(); }
});

// the projects' windows (components/windows/projects/), opened from their buttons, answered
// through the test frame
const fieldNames = w => w.wrapper.findAll(".setting-item-name").map(n => n.text());
const submitButton = w => w.wrapper.find(".ui-window__submit");
// a made-up Image Converter: every cover becomes Media/<name>.webp
const converter = () => {
  app.plugins.plugins["image-converter"] = {
    settings: { selectedConversionPreset: "WebP",
      conversionPresets: [{ name: "WebP", outputFormat: "WEBP", quality: 80 }] },
    imageProcessor: { processImage: async () => new Uint8Array([1]).buffer },
    supportedImageFormats: { getMimeTypeFromFile: async () => "image/webp",
      getExtensionsFromMimeType: () => ["webp"] },
  };
  app.fileManager.getAvailablePathForAttachment = async name => `Media/${name}`;
  app.vault.createBinary = async (path, data) => { files[path] = data; return { path }; };
};
const chooseFile = async (w, file) => {
  const input = w.wrapper.find("input[type=file]");
  Object.defineProperty(input.element, "files", { value: [file] });
  await input.trigger("change");
};

test("✦ New project: Status lit Active, Create greyed until a name; the cover saved, its page opened", async () => {
  const windows = testWindows(), seen = [];
  app.workspace.getLeavesOfType = () => [{ view: { go: async (...a) => seen.push(a) } }];
  app.workspace.revealLeaf = async () => {};
  try {
    const { el } = mount();
    button(el, "✦ New project").click();
    const w = await windows.next();
    assert.equal(w.title, "✦ New project");
    assert.deepEqual(fieldNames(w), ["Name", "Description", "Cover", "Status"]);
    assert.deepEqual([w.wrapper.find("input.ui-field-text__input"), w.wrapper.find("textarea")]
      .map(i => i.attributes("placeholder")), ["what it is", "a line about it"]);
    assert.equal(w.wrapper.find("input[type=file]").attributes("accept"),
      "image/*,.heic,.heif,.tif,.tiff");
    assert.deepEqual(w.wrapper.findAll(".ui-field-choice").map(c => c.text()),
      ["Idea", "Active", "Paused", "Done"]);
    assert.equal(w.wrapper.find(".mod-cta.ui-field-choice").text(), "Active");
    assert.equal(submitButton(w).text(), "Create");
    assert.equal(submitButton(w).element.disabled, true);

    await w.wrapper.find("input.ui-field-text__input").setValue(" Orchard ");
    await w.wrapper.find("textarea").setValue("apples\npears");
    await w.wrapper.findAll(".ui-field-choice")[0].trigger("click");
    await chooseFile(w, new File(["image"], "orchard.png"));
    await w.submit();
    // no Image Converter: the cover can't be saved, the window stays with what was typed
    assert.match(Notice.last, /image-converter/);
    assert.equal(windows.all.length, 1);
    assert.equal(JSON.parse(files[PROJECTS]).p5, undefined);

    converter();
    await w.submit();
    await until(() => seen.length);
    const { name, description, status, cover } = JSON.parse(files[PROJECTS]).p5;
    assert.deepEqual({ name, description, status, cover },
      { name: "Orchard", description: "apples\npears", status: "idea", cover: "Media/orchard.webp" });
    assert.deepEqual(seen, [["projects", { open: "p5" }]]);
    assert.equal(windows.all.length, 0);
  } finally { windows.restore(); }
});

test("Edit project: its values from disk and the calendar checkbox; Save writes them", async () => {
  const windows = testWindows();
  try {
    const { el } = mount({ open: "p1" });
    button(el, "Edit project").click();
    const w = await windows.next();
    assert.equal(w.title, "✦ Edit project");
    assert.deepEqual(fieldNames(w),
      ["Name", "Description", "Cover", "Показывать во вкладке Projects календаря"]);
    assert.equal(w.wrapper.find(".mod-toggle .setting-item-description").text(),
      "Запланированные задачи остаются в своих днях");
    assert.equal(w.wrapper.find("input.ui-field-text__input").element.value, "Garden");
    assert.equal(w.wrapper.find("textarea").element.value, "beds by the wall");
    const check = w.wrapper.find("input[type=checkbox]");
    assert.equal(check.element.checked, true);
    assert.equal(submitButton(w).text(), "Save");

    await w.wrapper.find("input.ui-field-text__input").setValue("Green garden");
    await check.setValue(false);
    await w.submit();
    await until(() => saved().name === "Green garden");
    assert.equal(saved().showInCalendar, false);
    assert.equal(saved().description, "beds by the wall");
    assert.equal(saved().stages.length, 2);
    assert.equal(windows.all.length, 0);

    // gone from disk meanwhile: the notice, no window
    files[PROJECTS] = "{}";
    button(el, "Edit project").click();
    await until(() => /changed or was deleted/.test(Notice.last));
    assert.match(Notice.last, /changed or was deleted/);
    assert.equal(windows.all.length, 0);
  } finally { windows.restore(); }
});

test("🗑️ a stage: Delete stage? names it; closed nothing, the checkbox deletes its open tasks", async () => {
  const windows = testWindows();
  try {
    const { el } = mount({ open: "p1" });
    const master = files[MASTER];
    stages(el)[0].querySelector("[aria-label=delete]").click();
    const a = await windows.next();
    assert.equal(a.title, "Delete stage?");
    assert.deepEqual(fieldNames(a), ["Stage", "Также удалить задачи этапа"]);
    assert.equal(a.wrapper.find(".ui-field__label").text(), "A");
    assert.equal(a.wrapper.find(".mod-toggle .setting-item-description").text(),
      "Только открытые копии без даты. Задачи других этапов сохранятся.");
    assert.equal(a.wrapper.find("input[type=checkbox]").element.checked, false);
    assert.equal(submitButton(a).text(), "Delete");
    await a.close();
    assert.equal(saved().stages.length, 2);

    stages(el)[1].querySelector("[aria-label=delete]").click();
    const b = await windows.next();
    await b.wrapper.find("input[type=checkbox]").setValue(true);
    await b.submit();
    await until(() => saved().stages.length === 1);
    assert.deepEqual(saved().stages.map(s => s.name), ["A"]);
    await until(() => files[MASTER] !== master);
    assert.equal(files[MASTER], "- [x] t1\n- [x] t2\n- [x] t3");
  } finally { windows.restore(); }
});

test("+ link: ✦ New link, Add greyed until a URL; not a web address or a failed write: it stays", async () => {
  const windows = testWindows();
  try {
    const { el } = mount({ open: "p1" });
    button(el, "+ link").click();
    const w = await windows.next();
    assert.equal(w.title, "✦ New link");
    assert.deepEqual(fieldNames(w), ["Title", "URL"]);
    const [title, url] = w.wrapper.findAll("input");
    assert.deepEqual([title, url].map(i => i.attributes("placeholder")), ["what it is", "https://…"]);
    assert.equal(submitButton(w).text(), "Add");
    assert.equal(submitButton(w).element.disabled, true);

    await title.setValue("Seeds");
    await url.setValue("seeds shop");
    await w.submit();
    assert.match(Notice.last, /web address/);
    assert.equal(windows.all.length, 1);

    const process = app.vault.process;
    app.vault.process = async () => { throw new Error("disk"); };
    await url.setValue("https://example.com/seeds");
    await w.submit();
    app.vault.process = process;
    assert.equal(Notice.last, "✦ Not saved (disk)");
    assert.equal(windows.all.length, 1);

    await w.submit();
    assert.deepEqual(saved().links, [{ title: "Seeds", url: "https://example.com/seeds" }]);
    assert.equal(windows.all.length, 0);
  } finally { windows.restore(); }
});

test("Промпты: tabs Start and Final, a text and its variables each; Сохранить saves both", async t => {
  const windows = testWindows();
  const { promptStart, promptFinal } = config;
  t.after(() => { Object.assign(config, { promptStart, promptFinal }); windows.restore(); });
  files[CONFIG] = "{}";
  Object.assign(config, { promptStart: "Start {Project_Name}", promptFinal: "Final" });
  const { el } = mount();
  button(el, "Промпты").click();
  const w = await windows.next();
  assert.equal(w.title, "Промпты проекта");
  assert.deepEqual(w.wrapper.findAll(".ui-tabs__tab").map(b => b.text()), ["Start", "Final"]);
  const [start, final] = w.wrapper.findAll(".ui-window__pane");
  assert.deepEqual(start.findAll(".setting-item-name").map(n => n.text()), ["Start", "Переменные"]);
  assert.deepEqual(final.findAll(".setting-item-name").map(n => n.text()), ["Final", "Переменные"]);
  assert.equal(start.find(".ui-field__label").text(), PROMPT_VARIABLES);
  assert.equal(final.find(".ui-field__label").text(), "нет: копируется как есть");
  assert.equal(start.find("textarea").element.value, "Start {Project_Name}");
  assert.equal(submitButton(w).text(), "Сохранить");

  await final.find("textarea").setValue("");
  assert.equal(submitButton(w).element.disabled, true);
  await final.find("textarea").setValue(" Wrap up ");
  await w.submit();
  assert.deepEqual(JSON.parse(files[CONFIG]),
    { promptStart: "Start {Project_Name}", promptFinal: "Wrap up" });
  assert.equal(windows.all.length, 0);
});
