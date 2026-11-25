import "./stubs/dom.mjs";
import { projectStore } from "#/entities/project/index.js";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Notice } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import { NOTES, PROJECTS } from "#/shared/config/index.js";

// A project's journal: the card on its page (the count, the last entry, the two prompts) and the
// window with the timeline (newest first, a filter by what an entry is about, + Entry, ✏️, ×)
const MASTER = "00 System/Data/Tasks/Master.md";
const RECORDS = "00 System/Data/Tasks/tasks.json";
let vue, taskStore, noteStore, openJournal, Card, testWindows, config, files, app;

before(async () => {
  HTMLElement.prototype.setText = function (t) { this.textContent = t; };
  HTMLElement.prototype.addClass = function (c) { this.classList.add(c); };
  window.moment = at => ({ format: f => (f === "YYYY-MM-DDTHH:mm" ? "2026-11-20T10:00" : `~${at}`) });
  vue = await import("vue");
  ({ taskStore } = await import("#/entities/task/index.js"));
  ({ noteStore } = await import("#/pages/projects/index.js"));
  ({ openJournal } = await import("#/components/pages/projects/JournalWindow/open.js"));
  Card = (await import("#/components/pages/projects/ProjectPage/ProjectJournal.vue")).default;
  ({ testWindows } = await import("./stubs/windows.mjs"));
  config = (await import("#/shared/config/index.js")).default;
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
  projectStore.putProjects(structuredClone(projects));
  noteStore.putNotes(structuredClone(notes));
});

const mount = (C, props) => {
  const el = document.body.appendChild(document.createElement("div"));

  vue.createApp(C, props).mount(el);
  return el;
};
const headings = el => [...el.querySelectorAll(".ui-journal__heading")].map(h => h.textContent);
const tick = () => new Promise(r => setTimeout(r));

async function showJournal(windows, project = "p1") {
  void openJournal(project);
  return (await windows.next()).wrapper.element;
}

test("the window: entries newest first, a missing title is the target's name", async t => {
  const windows = testWindows();
  t.after(windows.restore);
  const el = await showJournal(windows);

  assert.deepEqual(headings(el), ["dig", "Beds chosen", "Started"]);
  const meta = [...el.querySelectorAll(".ui-journal__meta")].map(m => m.textContent);

  assert.match(meta[0], /Task · dig/);
  assert.equal(el.querySelector(".ui-journal__text").textContent, "dug it");
  assert.equal(el.querySelectorAll(".ui-journal__dot").length, 3);
  assert.equal(el.querySelector(".ui-journal__link").textContent.trim(), "📄 soil");
});

test("the window's filter: what an entry is about, with counts", async t => {
  const windows = testWindows();
  t.after(windows.restore);
  const el = await showJournal(windows);
  const tabs = [...el.querySelectorAll(".ui-tabs button, .ui-tabs__tab")];

  assert.deepEqual(tabs.map(t => t.textContent.trim()),
    ["All · 3", "Project · 1", "Stages · 1", "Tasks · 1"]);
  tabs[2].click();
  await vue.nextTick();
  assert.deepEqual(headings(el), ["Beds chosen"]);
});

test("the window of a project without entries says so", async t => {
  projectStore.putProjects({ ...structuredClone(projects), p3: { name: "Kite", stages: [] } });
  const windows = testWindows();
  t.after(windows.restore);
  const el = await showJournal(windows, "p3");

  assert.match(el.querySelector(".ui-journal__empty").textContent, /No entries yet/);
});

// + Entry and ✏️ open the entry's window (windows/projects/JournalEntryWindow) in the test frame
const entryButton = el => [...el.querySelectorAll("button")].find(b => b.textContent === "+ Entry");

test("+ Entry: About lists the project, its stages and tasks; the note is owned by the project", async () => {
  const windows = testWindows();
  try {
    const el = await showJournal(windows);
    entryButton(el).click();
    const w = await windows.next();

    assert.equal(w.title, "✦ New entry");
    assert.deepEqual(w.wrapper.findAll(".setting-item-name").map(n => n.text()),
      ["About", "Title", "Text", "Note"]);
    const about = w.wrapper.find("select.dropdown");

    assert.deepEqual(about.findAll("option").map(o => o.text()),
      ["Project · Garden", "Stage 01 · Beds", "Task · dig", "Task · rake"]);
    assert.equal(about.element.value, "project:p1");
    assert.deepEqual([w.wrapper.find("input"), w.wrapper.find("textarea")]
      .map(i => i.attributes("placeholder")),
    ["empty: the name of what it is about", "what came out of it"]);
    assert.equal(w.wrapper.find(".ui-field-pick__button").text(), "Choose…");
    assert.equal(w.wrapper.find(".ui-window__submit").text(), "Add");
    await about.setValue("stage:st1");
    await w.wrapper.find("input").setValue(" ");
    await w.wrapper.find("textarea").setValue("chose beds");
    await w.submit();
  } finally { windows.restore(); }
  const saved = Object.values(JSON.parse(files[NOTES])).at(-1);

  assert.deepEqual(saved.owner, { kind: "project", id: "p1" });
  assert.deepEqual(saved.target, { kind: "stage", id: "st1" });
  assert.equal(saved.title, "");
  assert.equal(saved.text, "chose beds");
});

test("+ Entry with nothing written: nothing saved, a Notice says why, the window stays", async () => {
  const windows = testWindows();
  const before = files[NOTES];

  try {
    const el = await showJournal(windows);
    entryButton(el).click();
    const w = await windows.next();

    await w.submit();
    assert.equal(files[NOTES], before);
    assert.match(Notice.last, /title, a text or a note/);
    assert.equal(windows.all.length, 2);
  } finally { windows.restore(); }
});

test("✏️ an entry: its fields prefilled, About not asked again, the edit saved", async () => {
  const windows = testWindows();
  try {
    const el = await showJournal(windows);
    el.querySelectorAll(".ui-journal__entry [title=Edit]")[0].click();   // n2, the newest
    const w = await windows.next();

    assert.equal(w.title, "✦ Edit entry");
    assert.deepEqual(w.wrapper.findAll(".setting-item-name").map(n => n.text()),
      ["Title", "Text", "Note", "When"]);
    const [title, when] = w.wrapper.findAll("input");

    assert.equal(title.element.value, "");
    assert.equal(w.wrapper.find("textarea").element.value, "dug it");
    assert.equal(w.wrapper.find(".ui-field-pick__button").text(), "Notes/soil.md");
    assert.equal(when.element.value, "2026-11-10T18:30");
    assert.equal(when.attributes("placeholder"), "YYYY-MM-DDTHH:mm");
    assert.equal(w.wrapper.find(".ui-window__submit").text(), "Save");
    await when.setValue("");
    assert.equal(w.wrapper.find(".ui-window__submit").element.disabled, true);
    await when.setValue("2026-11-10T18:30");
    await title.setValue("Dug the beds");
    await w.submit();
    assert.equal(windows.all.length, 1);
  } finally { windows.restore(); }
  assert.equal(JSON.parse(files[NOTES]).n2.title, "Dug the beds");
  assert.equal(JSON.parse(files[NOTES]).n2.link, "Notes/soil.md");
});

test("the card: the count, the last entry in one line, Start and Final", () => {
  const el = mount(Card, { project: "p1" });

  assert.match(el.querySelector(".ui-project__journal-open").textContent, /🕒\s*3/);
  assert.match(el.querySelector(".ui-project__journal-last").textContent, /dig/);
  const buttons = [...el.querySelectorAll("button")].map(b => b.textContent.trim());

  assert.ok(buttons.includes("🚀 Start") && buttons.includes("📝 Final"));
});

test("saving an older journal editor preserves a newer entry", async t => {
  const windows = testWindows();
  t.after(windows.restore);
  const el = await showJournal(windows);
  el.querySelector(".ui-journal__entry [title=Edit]").click();
  const w = await windows.next();
  const newer = { ...notes.n2, text: "Newer text from the other editor" };
  files[NOTES] = JSON.stringify({ ...notes, n2: newer });

  await w.wrapper.get('input[placeholder="empty: the name of what it is about"]')
    .setValue("My heading");
  await w.submit();

  assert.deepEqual(JSON.parse(files[NOTES]).n2, newer);
  assert.equal(windows.all.at(-1), w);
  assert.match(Notice.last, /entry changed/);
});

test("both journal openers use the window and its note link closes it", async () => {
  const windows = testWindows();
  const opened = [];
  app.workspace.openLinkText = path => opened.push(path);
  const el = mount(Card, { project: "p1" });
  try {
    for (const selector of [".ui-project__journal-open", ".ui-project__journal-last"]) {
      el.querySelector(selector).click();
      assert.equal(windows.all.length, 1);
      const w = await windows.next();

      assert.equal(w.title, "🕒 Journal · Garden");
      assert.ok(w.classes.includes("ui-journal-window"));
      assert.equal(w.wrapper.find(".ui-window__submit").exists(), false);
      await w.wrapper.get(".ui-journal__link").trigger("click");
      assert.equal(windows.all.length, 0);
    }
    assert.deepEqual(opened, ["Notes/soil.md", "Notes/soil.md"]);
  } finally { windows.restore(); }
});

test("the card of a project without entries: no last line, the count 0", async () => {
  projectStore.putProjects({ ...structuredClone(projects), p3: { name: "Kite", stages: [] } });
  const el = mount(Card, { project: "p3" });

  await tick();
  assert.match(el.querySelector(".ui-project__journal-open").textContent, /0/);
  assert.equal(el.querySelector(".ui-project__journal-last"), null);
});

test("× an entry asks Delete entry? with its heading; closed it stays, else removed", async () => {
  const windows = testWindows();
  try {
    const el = await showJournal(windows);
    const remove = i => el.querySelectorAll(".ui-journal__entry [title=Delete]")[i].click();

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
