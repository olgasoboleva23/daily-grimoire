import "./stubs/dom.mjs";
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { vault } from "./stubs/vault.mjs";
import { COURSES } from "#/shared/config/index.js";

let mount, reactive, MedsPage, loadMeds, testWindows, Notice;
before(async () => {
  window.moment = () => ({ format: () => "2026-11-08" });
  ({ mount } = await import("@vue/test-utils"));
  ({ reactive } = await import("vue"));
  MedsPage = (await import("#/components/pages/meds/index.vue")).default;
  ({ loadMeds } = await import("#/pages/meds/model/store.js"));
  ({ testWindows } = await import("./stubs/windows.mjs"));
  ({ Notice } = await import("obsidian"));
});

// two made-up courses: c1 running (today is its day 2 of 3), c2 over
const C1 = {
  start: "2026-11-07",
  meds: [
    { name: "Аевит", code: "АЕ", dose: "1 таблетка", times: [], meal: "after", ranges: [{ from: 1, to: 2 }] },
    { name: "Магний 2 таблетки", code: "МГ", dose: "", times: ["morning", "evening"], meal: "before", ranges: [{ from: 1, to: 3 }] },
  ],
  notes: "После еды\nЗапивать водой",
  marks: {
    "2026-11-07": { "АЕ": "✅", "МГ☀️": "✅", "МГ🌙": "❌" },
    "2026-11-08": { "МГ☀️": "✅" },
  },
  dayNotes: { "2026-11-08": "сегодня" },
};
const C2 = {
  start: "2026-10-01",
  meds: [{ name: "Цинк", code: "ЦИ", dose: "", times: [], meal: "any", ranges: [{ from: 1, to: 2 }] }],
  notes: "", marks: { "2026-10-01": { "ЦИ": "✅" } }, dayNotes: {},
};
const tick = () => new Promise(r => setTimeout(r));
const read = files => JSON.parse(files[COURSES]);

// the page over the stub's courses.json, as its block draws it
async function page(recs = { c2: C2, c1: C1 }) {
  const stub = vault({ [COURSES]: JSON.stringify(recs) });
  const state = reactive({ data: await loadMeds() });

  return { ...stub, state, w: mount(MedsPage, { props: { state } }) };
}

test("MedsPage: a tab per course in one row, the running one first and shown", async () => {
  const { w } = await page();
  const tabs = w.findAll(".ui-tabs__tab");

  assert.ok(w.find(".ui-tabs").classes("ui-tabs--scroll"));
  assert.deepEqual(tabs.map(t => t.text()), ["7 ноя", "1 окт"]);
  assert.equal(tabs[0].attributes("data-tip"), "ui-tooltip");
  assert.ok(tabs[0].classes("ui-tabs__tab--on"));
  assert.equal(w.find(".ui-meds__sum").text().replace(/\s+/g, " "),
    "день 2 из 3 · принято 3 из 6");
  await tabs[1].trigger("click");
  assert.equal(w.find(".ui-meds__sum").text().replace(/\s+/g, " "),
    "день 3 из 2 · принято 1 из 2");
});

test("MedsCourse: Приём, Заметки when there are notes, the counts, chips, grid and legend", async () => {
  const { w } = await page();

  assert.deepEqual(w.findAll(".ui-meds__intake").map(e => e.text()),
    ["☀️ утро, перед едой: Магний 2 таблетки", "🌙 на ночь, перед едой: Магний 2 таблетки",
      "в любое время, после еды: Аевит 1 таблетка"]);
  assert.ok(w.findAll(".ui-card__title-inner").map(e => e.text()).includes("Заметки"));
  assert.equal(w.find(".ui-meds__notes").element.textContent, C1.notes);
  assert.deepEqual(w.findAll(".ui-meds__chip").map(c => [c.text(), c.attributes("data-mark")]),
    [["Магний", "✅"], ["Магний", "☐"], ["Аевит", "☐"]]);
  assert.equal(w.findAll(".ui-table__row").length, 3);
  assert.deepEqual(w.findAll(".ui-meds__legend")[0].findAll("span")
    .map(e => e.text().replace(/\s+/g, " ")), ["АЕ Аевит", "МА Магний", "☀️ утро", "🌙 на ночь"]);
  assert.equal(w.findAll(".ui-meds__row--today").length, 1);
  assert.equal(w.findAll(".ui-meds__tick").length, 8);   // Аевит's last day is blank
  assert.equal(w.find(".ui-meds__row--past .ui-meds__tick").classes("ui-check--on"), true);
  await w.findAll(".ui-tabs__tab")[1].trigger("click");
  assert.ok(!w.findAll(".ui-card__title-inner").map(e => e.text()).includes("Заметки"));
});

test("MedsCourse: a tick or a chip goes round at once and writes its key; a note as typed", async () => {
  const { w, files } = await page();
  const todayTicks = w.find(".ui-meds__row--today").findAll(".ui-meds__tick");

  await todayTicks[0].trigger("click"); await tick();
  assert.equal(todayTicks[0].attributes("data-mark"), "✅");
  assert.equal(read(files).c1.marks["2026-11-08"]["АЕ"], "✅");
  assert.equal(w.findAll(".ui-meds__chip")[2].attributes("data-mark"), "✅");   // the chip follows
  // a chip: ✅ → ❌, the grid's cell follows
  await w.findAll(".ui-meds__chip")[0].trigger("click");
  assert.equal(w.findAll(".ui-meds__chip")[0].attributes("data-mark"), "❌");
  await tick();
  assert.equal(read(files).c1.marks["2026-11-08"]["МГ☀️"], "❌");
  assert.equal(todayTicks[1].attributes("data-mark"), "❌");
  const input = w.find(".ui-meds__row--future .ui-meds__note-input");

  input.element.value = "забыла | поездка";
  await input.trigger("change"); await tick();
  assert.equal(read(files).c1.dayNotes["2026-11-09"], "забыла | поездка");
});

test("MedsCourse: a write that fails puts the mark and the note back, and says so", async () => {
  const { w, state, app } = await page();
  const error = console.error, process = app.vault.process;
  const failOnce = () => {
    app.vault.process = async () => {
      app.vault.process = process;
      throw new Error("disk");
    };
  };

  console.error = () => {};
  failOnce();
  await w.find(".ui-meds__row--future .ui-meds__tick").trigger("click"); await tick(); await tick();
  assert.equal(w.find(".ui-meds__row--future .ui-meds__tick").attributes("data-mark"), "☐");
  assert.match(Notice.last, /^✦ Not saved/);
  failOnce();
  const input = w.find(".ui-meds__row--future .ui-meds__note-input");

  input.element.value = "забыла";
  await input.trigger("change"); await tick(); await tick();
  assert.equal(state.data.data.c1.rows[2].note, "");
  console.error = error;
});

test("MedsCourse: a course deleted meanwhile: the mark goes back, said", async () => {
  const { w, files } = await page();

  files[COURSES] = JSON.stringify({ c2: C2 });
  await w.find(".ui-meds__row--future .ui-meds__tick").trigger("click"); await tick(); await tick();
  assert.equal(w.find(".ui-meds__row--future .ui-meds__tick").attributes("data-mark"), "☐");
  assert.equal(Notice.last, "✦ that course is gone");
});

test("MedsCourse: ✎ in the Курс card edits the course shown", async () => {
  const { w } = await page();
  const windows = testWindows();

  try {
    await w.findAll(".ui-tabs__tab")[1].trigger("click");
    const card = w.findAll(".ui-card").find(c => c.find(".ui-meds__sum").exists());

    await card.find(".ui-card__title .ui-card__add").trigger("click");
    const edit = await windows.next();

    assert.equal(edit.title, "✦ Edit medication course");
    assert.equal(edit.props.id, "c2");
    await edit.close();
  } finally { windows.restore(); }
});

test("MedsPage: no courses yet says how to make one", async () => {
  const { w } = await page({});

  assert.match(w.find(".ui-empty").text(), /New medication course/);
});
