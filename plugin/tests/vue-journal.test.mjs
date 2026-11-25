import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Notice } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import { NOTES, PROJECTS } from "#/helpers/paths.js";

// A project's journal: the card on its page (the count, the last entry, the two prompts) and the
// window with the timeline (newest first, a filter by what an entry is about, + Entry, ✏️, ×)
const MASTER = "00 System/Data/Tasks/Master.md";
const RECORDS = "00 System/Data/Tasks/tasks.json";
let vue, taskStore, notesOf, Form, Journal, Card, askEntry, testWindows, config, files, app;

before(async () => {
  GlobalRegistrator.register();
  HTMLElement.prototype.setText = function (t) { this.textContent = t; };
  HTMLElement.prototype.addClass = function (c) { this.classList.add(c); };
  window.moment = at => ({ format: f => (f === "YYYY-MM-DDTHH:mm" ? "2026-11-20T10:00" : `~${at}`) });
  vue = await import("vue");
  ({ Form } = await import("#/components/uikit/Form/index.ts"));
  ({ taskStore, notes: notesOf } = await import("#/store/tasks.js"));
  Journal = (await import("#/components/pages/projects/JournalWindow/index.vue")).default;
  Card = (await import("#/components/pages/projects/ProjectPage/ProjectJournal.vue")).default;
  ({ askEntry } = await import("#/components/pages/projects/JournalWindow/entry.js"));
  ({ testWindows } = await import("./stubs/windows.mjs"));
  config = (await import("#/helpers/config.js")).default;
});

// made-up: Garden with a stage of two tasks, its three notes and one of another project
const projects = {
  p1: { name: "Garden", status: "active", result: "", notes: "", stages: [
    { id: "st1", name: "Beds", tasks: ["t1", "t2"] }] },
  p2: { name: "Shed", status: "idea", stages: [] },
};
const notes = {
  n1: { at: "2026-11-01T09:00", owner: { kind: "project", id: "p1" },
    target: { kind: "project", id: "p1" }, title: "Started", text: "planning", link: "" },
  n2: { at: "2026-11-10T18:30", owner: { kind: "project", id: "p1" },
    target: { kind: "task", id: "t1" }, title: "", text: "dug it", link: "Notes/soil.md" },
  n3: { at: "2026-11-05T12:00", owner: { kind: "project", id: "p1" },
    target: { kind: "stage", id: "st1" }, title: "Beds chosen", text: "", link: "" },
  n4: { at: "2026-11-15T12:00", owner: { kind: "project", id: "p2" },
    target: { kind: "project", id: "p2" }, title: "Shed note", text: "", link: "" },
};

beforeEach(() => {
  const records = { t1: { name: "dig" }, t2: { name: "rake" } };

  ({ files, app } = vault({
    [MASTER]: "- [ ] t1\n- [ ] t2", [RECORDS]: JSON.stringify(records),
    [PROJECTS]: JSON.stringify(projects), [NOTES]: JSON.stringify(notes), "Notes/soil.md": "",
  }));
  taskStore.put(MASTER, "- [ ] t1\n- [ ] t2");
  taskStore.putRecords(records);
  taskStore.putProjects(structuredClone(projects));
  notesOf.load(structuredClone(notes));
  taskStore.version.value++;
});

const mount = (C, props) => {
  const el = document.body.appendChild(document.createElement("div"));

  vue.createApp(C, props).mount(el);
  return el;
};
const headings = el => [...el.querySelectorAll(".ui-journal__heading")].map(h => h.textContent);
const tick = () => new Promise(r => setTimeout(r));

test("the window: the project's entries newest first, a missing title is the target's name", () => {
  const el = mount(Journal, { project: "p1" });

  assert.deepEqual(headings(el), ["dig", "Beds chosen", "Started"]);
  const meta = [...el.querySelectorAll(".ui-journal__meta")].map(m => m.textContent);

  assert.match(meta[0], /Task · dig/);
  assert.equal(el.querySelector(".ui-journal__text").textContent, "dug it");
  assert.equal(el.querySelectorAll(".ui-journal__dot").length, 3);
  assert.equal(el.querySelector(".ui-journal__link").textContent.trim(), "📄 soil");
});

test("the window's filter: what an entry is about, with counts", async () => {
  const el = mount(Journal, { project: "p1" });
  const tabs = [...el.querySelectorAll(".ui-tabs button, .ui-tabs__tab")];

  assert.deepEqual(tabs.map(t => t.textContent.trim()),
    ["All · 3", "Project · 1", "Stages · 1", "Tasks · 1"]);
  tabs[2].click();
  await vue.nextTick();
  assert.deepEqual(headings(el), ["Beds chosen"]);
});

test("the window of a project without entries says so", () => {
  taskStore.putProjects({ ...structuredClone(projects), p3: { name: "Kite", stages: [] } });
  const el = mount(Journal, { project: "p3" });

  assert.match(el.querySelector(".ui-journal__empty").textContent, /No entries yet/);
});

test("+ Entry: About lists the project, its stages and tasks; the note is owned by the project", async () => {
  const ask = Form.ask;
  let rows;

  Form.ask = async (_app, _title, r) => {
    rows = r;
    return { about: "stage:st1", title: " ", text: "chose beds", link: "" };
  };
  try { await askEntry(app, "p1"); } finally { Form.ask = ask; }
  assert.deepEqual(rows.find(r => r.key === "about").select.map(c => c.label),
    ["Project · Garden", "Stage 01 · Beds", "Task · dig", "Task · rake"]);
  const saved = Object.values(JSON.parse(files[NOTES])).at(-1);

  assert.deepEqual(saved.owner, { kind: "project", id: "p1" });
  assert.deepEqual(saved.target, { kind: "stage", id: "st1" });
  assert.equal(saved.text, "chose beds");
});

test("+ Entry with nothing written: nothing saved, a Notice says why", async () => {
  const ask = Form.ask;
  const before = files[NOTES];

  Form.ask = async () => ({ about: "project:p1", title: "", text: "", link: "" });
  try { await askEntry(app, "p1"); } finally { Form.ask = ask; }
  assert.equal(files[NOTES], before);
  assert.match(Notice.last, /title, a text or a note/);
});

test("✏️ an entry: its fields prefilled, About not asked again, the edit saved", async () => {
  const ask = Form.ask;
  let rows, values;

  Form.ask = async (_app, _title, r, o) => {
    rows = r; values = o.values;
    return { ...o.values, title: "Dug the beds" };
  };
  try {
    await askEntry(app, "p1", { id: "n2", ...notes.n2 });
  } finally { Form.ask = ask; }
  assert.equal(rows.some(r => r.key === "about"), false);
  assert.equal(values.link, "Notes/soil.md");
  assert.equal(JSON.parse(files[NOTES]).n2.title, "Dug the beds");
});

test("the card: the count, the last entry in one line, Start and Final", () => {
  const el = mount(Card, { project: "p1" });

  assert.match(el.querySelector(".ui-project__journal-open").textContent, /🕒\s*3/);
  assert.match(el.querySelector(".ui-project__journal-last").textContent, /dig/);
  const buttons = [...el.querySelectorAll("button")].map(b => b.textContent.trim());

  assert.ok(buttons.includes("🚀 Start") && buttons.includes("📝 Final"));
});

test("the card of a project without entries: no last line, the count 0", async () => {
  taskStore.putProjects({ ...structuredClone(projects), p3: { name: "Kite", stages: [] } });
  const el = mount(Card, { project: "p3" });

  await tick();
  assert.match(el.querySelector(".ui-project__journal-open").textContent, /0/);
  assert.equal(el.querySelector(".ui-project__journal-last"), null);
});

test("× an entry asks Delete entry? with its heading; closed it stays, else removed", async () => {
  const windows = testWindows();
  const el = mount(Journal, { project: "p1" });
  const remove = i => el.querySelectorAll(".ui-journal__entry [title=Delete]")[i].click();

  try {
    remove(1);
    const w = await windows.next();

    assert.deepEqual(w.props, { title: "Delete entry?", submit: "Delete",
      lines: [{ name: "Entry", text: "Beds chosen" }] });
    await w.close();
    assert.ok(JSON.parse(files[NOTES]).n3);
    remove(1);
    await (await windows.next()).submit();
    await tick();
    assert.deepEqual(Object.keys(JSON.parse(files[NOTES])), ["n1", "n2", "n4"]);
  } finally { windows.restore(); }
});

test("🚀 Start asks the task for this session, then copies the prompt; closed: nothing", async t => {
  const windows = testWindows();
  const copied = [], start = config.promptStart;

  Object.defineProperty(navigator, "clipboard", {
    configurable: true, value: { writeText: async text => copied.push(text) },
  });
  config.promptStart = "{Project_Name}: {Current_Task_Or_Input}";
  t.after(() => { config.promptStart = start; windows.restore(); });
  const el = mount(Card, { project: "p1" });
  const startButton = [...el.querySelectorAll("button")]
    .find(b => b.textContent.trim() === "🚀 Start");

  startButton.click();
  const w = await windows.next();

  assert.deepEqual(w.props, { title: "Start", name: "Task for this session", submit: "Copy" });
  await w.wrapper.find("input").setValue(" sow the beds ");
  await w.submit();
  assert.deepEqual(copied, ["Garden: sow the beds"]);
  startButton.click();
  await (await windows.next()).close();
  assert.deepEqual(copied, ["Garden: sow the beds"]);
});
