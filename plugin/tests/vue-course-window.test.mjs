import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Notice } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import { COURSES } from "#/helpers/paths.js";

// A medication course's window (components/windows/meds/CourseWindow), new and edit, through the
// test frame as its openers do (the commands, the course's ✎): its stacked medicines, days that
// don't read keep it open, the course saved. Made-up medicines only.
const REC = {
  start: "2026-11-07",
  meds: [{ name: "Аевит", code: "АЕ", dose: "1 таблетка", times: ["morning", "evening"],
    meal: "after", ranges: [{ from: 1, to: 2 }] }],
  notes: "после еды", marks: { "2026-11-07": { "АЕ☀️": "✅" } }, dayNotes: { "2026-11-07": "ок" },
};
let testWindows, windows, flows, registerCommands, columns;
before(async () => {
  GlobalRegistrator.register();
  window.moment = () => ({ format: () => "2026-11-08" });
  ({ testWindows } = await import("./stubs/windows.mjs"));
  flows = await import("#/components/windows/meds/CourseWindow/open.js");
  ({ registerCommands } = await import("#/commands/commands.ts"));
  ({ columns } = await import("#/models/course.js"));
  windows = testWindows();
});
after(() => windows.restore());

// a vault whose workspace records the tabs opened
const files = (recs = null) => {
  const opened = [];
  const v = vault(recs ? { [COURSES]: JSON.stringify(recs) } : {});

  v.app.workspace.getLeaf = () => ({ setViewState: async s => { opened.push(s); } });
  v.app.workspace.revealLeaf = async () => {};
  return { ...v, opened };
};
const read = written => JSON.parse(written[COURSES]);
const names = w => w.wrapper.findAll(".setting-item-name").map(n => n.text());
const greyed = w => w.wrapper.find(".ui-window__submit").element.disabled;
const group = (w, n = 0) => w.wrapper.findAll(".ui-field-list__group")[n];
const text = (el, n) => el.findAll("input.ui-field-text__input")[n];
const checks = el => el.findAll("input[type=checkbox]");
const meals = el => el.findAll(".ui-field-choice");

test("New medication course: a medicine's rows stacked, Start, Notes; Create greyed until a name; "
  + "saved, then the Medication page opens", async () => {
  const { files: written, opened } = files();
  const running = flows.openNewCourse();
  const w = await windows.next();

  assert.equal(w.title, "✦ New medication course");
  assert.deepEqual(names(w), ["Medicines", "Name", "Dose", "Утром", "Днём", "Вечером", "Meal",
    "Days", "Start", "Notes"]);
  assert.deepEqual(w.wrapper.findAll(".setting-item-description").map(d => d.text()),
    ["Ничего не отмечено — один приём в любое время", "", ""]);
  assert.deepEqual(w.wrapper.findAll("input.ui-field-text__input")
    .map(i => i.attributes("placeholder")),
  ["Мастодинон", "30 капель", "1-30, 45-60 (empty: 1-90)", "YYYY-MM-DD (empty: today)"]);
  assert.equal(w.wrapper.find("textarea").attributes("placeholder"),
    "доп. информация: от врача, как принимать…");
  assert.deepEqual(meals(group(w)).map(c => c.text()),
    ["перед едой", "после еды", "перед сном", "неважно"]);
  assert.deepEqual(checks(group(w)).map(c => c.attributes("aria-label")),
    ["Утром", "Днём", "Вечером"]);
  assert.equal(w.wrapper.find(".ui-window__submit").text(), "Create");
  assert.equal(greyed(w), true);

  await text(group(w), 0).setValue("Тест");
  await checks(group(w))[0].setValue(true);
  await checks(group(w))[1].setValue(true);
  await meals(group(w))[1].trigger("click");
  await text(group(w), 2).setValue("1-2");
  assert.equal(greyed(w), false);
  await w.submit();

  assert.equal(await running, "c1");
  const [c1] = Object.values(read(written));

  assert.equal(c1.start, "2026-11-08");
  assert.deepEqual([c1.meds[0].times, c1.meds[0].meal], [["morning", "day"], "after"]);
  assert.deepEqual(columns(c1.meds).map(c => c.key), ["ТЕ☀️", "ТЕ🌤"]);
  assert.deepEqual(opened, [{ type: "ui-app", active: true, state: { page: "meds", meds: {} } }]);
});

test("New medication course: days that don't read: the notice, the window stays with what was "
  + "typed; fixed, saved", async () => {
  const { files: written } = files();
  const running = flows.openNewCourse();
  const w = await windows.next();

  await text(group(w), 0).setValue("Аевит");
  await text(group(w), 2).setValue("1-3O");
  await w.submit();
  assert.equal(Notice.last.startsWith("✦ days of «Аевит»: can't read «1-3O»"), true);
  assert.equal(windows.all.includes(w), true);
  assert.equal(COURSES in written, false);
  assert.equal(text(group(w), 0).element.value, "Аевит");

  await text(group(w), 2).setValue("1-3");
  await w.submit();
  assert.equal(await running, "c1");
  assert.deepEqual(read(written).c1.meds[0].ranges, [{ from: 1, to: 3 }]);
});

test("New medication course: closed, nothing saved, no page opened", async () => {
  const { files: written, opened } = files();
  const running = flows.openNewCourse();

  await (await windows.next()).close();
  assert.equal(await running, null);
  assert.equal(COURSES in written, false);
  assert.deepEqual(opened, []);
});

test("Edit medication course: its values (times checked, days as text); Save keeps the marks and "
  + "day notes", async () => {
  const { files: written } = files({ c1: REC });
  const running = flows.openEditCourse("c1");
  const w = await windows.next();

  assert.equal(w.title, "✦ Edit medication course");
  assert.equal(w.wrapper.find(".ui-window__submit").text(), "Save");
  assert.deepEqual([0, 1, 2].map(n => text(group(w), n).element.value),
    ["Аевит", "1 таблетка", "1-2"]);
  assert.deepEqual(checks(group(w)).map(c => c.element.checked), [true, false, true]);
  assert.deepEqual(meals(group(w)).filter(c => c.classes("mod-cta")).map(c => c.text()),
    ["после еды"]);
  assert.equal(text(w.wrapper, 3).element.value, "2026-11-07");
  assert.equal(w.wrapper.find("textarea").element.value, "после еды");

  await w.wrapper.find(".ui-field-list__more button").trigger("click");
  await text(group(w, 1), 0).setValue("Магний");
  await w.wrapper.find("textarea").setValue("утром и вечером");
  await w.submit();

  assert.equal(await running, "saved");
  const c1 = read(written).c1;

  assert.deepEqual(c1.meds.map(m => m.name), ["Аевит", "Магний"]);
  assert.equal(c1.notes, "утром и вечером");
  assert.deepEqual([c1.marks, c1.dayNotes], [REC.marks, REC.dayNotes]);
});

test("Edit medication course: changed meanwhile, the notice; gone, no window", async () => {
  const { files: written } = files({ c1: REC });
  const running = flows.openEditCourse("c1");
  const w = await windows.next();

  written[COURSES] = JSON.stringify({ c1: { ...REC, notes: "новее" } });
  await w.submit();
  assert.equal(await running, "changed");
  assert.equal(Notice.last, "✦ the course changed meanwhile: open its window again");
  assert.equal(read(written).c1.notes, "новее");

  assert.equal(await flows.openEditCourse("c9"), undefined);
  assert.equal(Notice.last, "✦ that course is gone");
  assert.equal(windows.all.length, 0);
});

test("the New / Edit medication course commands open the window", async () => {
  const list = {};
  const { app } = files({ c1: REC });

  registerCommands({
    app, loadData: async () => ({}), addCommand: c => { list[c.id] = c.callback; },
  });
  const create = list["new-meds"]();
  const fresh = await windows.next();

  assert.equal(fresh.title, "✦ New medication course");
  await fresh.close();
  await create;

  const edit = list["edit-meds"]();   // the only course: no picker
  const course = await windows.next();

  assert.equal(course.title, "✦ Edit medication course");
  await course.close();
  await edit;
});
