import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MARKS, dayNote, eaten, foodWeek, marksOf, recipeCourse, withEaten,
  withMarks, withNote, withoutEaten, withTask,
} from "#/models/food.js";
import { forFood } from "#/models/course.js";

const MARKS = [{ tag: "m1", icon: "🍫", name: "какао" }];
const FOOD = {
  marks: MARKS, task: "t5",

};
const LOG = {
  "2026-11-02": { eaten: ["m1", "m2"], note: "сыпь на подбородке" },
  "2026-11-03": { eaten: ["m1"], note: "" },
};

const items = [{ id: "m1", type: "food", name: "каша с 4 ч", marks: ["m1"] },
  { id: "m2", type: "food", name: "кофе с бзм", marks: ["m3"] }];

test("food settings keep the training task and use the default marks until edited", () => {
  assert.deepEqual(marksOf(FOOD), MARKS);
  assert.deepEqual(DEFAULT_MARKS.map(m => m.icon), ["🍫", "🥛", "🥛↓"]);
  assert.equal(marksOf({}), DEFAULT_MARKS);
  assert.deepEqual(withMarks(FOOD, []), { ...FOOD, marks: [] });
  assert.deepEqual(withTask(FOOD, "t9"), { ...FOOD, task: "t9" });
});

test("log.json: what was eaten by day, the day's note; one eaten added or taken off, a note "
  + "set or cleared, an empty day dropped", () => {
  assert.deepEqual(eaten(LOG, "2026-11-02"), ["m1", "m2"]);
  assert.deepEqual(eaten(LOG, "2026-11-04"), []);
  assert.equal(dayNote(LOG, "2026-11-02"), "сыпь на подбородке");
  assert.equal(dayNote(LOG, "2026-11-03"), "");

  assert.deepEqual(withEaten(LOG, "2026-11-03", "m2")["2026-11-03"],
    { eaten: ["m1", "m2"], note: "" });
  assert.deepEqual(withEaten({}, "2026-11-04", "m2"),
    { "2026-11-04": { eaten: ["m2"], note: "" } });
  assert.deepEqual(withoutEaten(LOG, "2026-11-02", 1)["2026-11-02"],
    { eaten: ["m1"], note: "сыпь на подбородке" });
  assert.equal(withoutEaten(LOG, "2026-11-02", 5), LOG);
  assert.deepEqual(Object.keys(withoutEaten(LOG, "2026-11-03", 0)), ["2026-11-02"]);
  assert.deepEqual(eaten(LOG, "2026-11-02"), ["m1", "m2"]);   // the old object untouched

  assert.equal(withNote(LOG, "2026-11-02", " прошло ")["2026-11-02"].note, "прошло");
  assert.deepEqual(withNote(LOG, "2026-11-03", "ок")["2026-11-03"], { eaten: ["m1"], note: "ок" });
  assert.deepEqual(withNote(LOG, "2026-11-02", "")["2026-11-02"],
    { eaten: ["m1", "m2"], note: "" });
  assert.deepEqual(withNote({ "2026-11-03": { eaten: [], note: "ок" } }, "2026-11-03", ""), {});
});

test("foodWeek: a row per day: what was eaten with its marks, the marks counted, each "
  + "journal's level after its lag, the courses on, the note", () => {
  const marks = [...DEFAULT_MARKS];
  const entries = new Map([["2026-11-03", { level: 2, reasons: ["🍰"] }]]);
  const journals = [{ path: "J/Skin.md", name: "Skin", lag: 1, entries }];
  // a course as courses.json keeps it; АЕ has no ranges: 1-90, as the course's grid shows it
  const courses = [forFood("c1", { start: "2026-11-02", meds: [
    { name: "мастодинон", code: "МА", times: ["morning", "evening"], ranges: [{ from: 1, to: 10 }] },
    { name: "баксет", code: "БА", times: [], ranges: [{ from: 1, to: 1 }] }, { name: "аевит", code: "АЕ" },
  ], marks: { "2026-11-02": { "МА☀️": "✅", "БА": "❌" } } })];
  const days = ["2026-11-02", "2026-11-03"];
  const [mon, tue] =
    foodWeek({ items, dishes: [], marks, log: LOG, journals, courses, days });

  assert.deepEqual(mon.items.map(i => [i.id, i.name, i.icons]),
    [["m1", "каша с 4 ч", "🍫"], ["m2", "кофе с бзм", "🥛↓"]]);
  assert.deepEqual(mon.counts, { m1: 1, m2: 0, m3: 1 });
  // the next day's
  assert.deepEqual(mon.journals, [{ name: "Skin", level: 2, reasons: ["🍰"], on: "2026-11-03" }]);
  // the course's medicines on that day: a short code each, the full name for its tip
  assert.deepEqual(mon.courses, [{ id: "c1", name: "мастодинон, баксет, аевит", meds: [
    { code: "МА", name: "мастодинон", taken: true },
    { code: "БА", name: "баксет", taken: false },
    { code: "АЕ", name: "аевит", taken: false },
  ] }]);
  // баксет's one day is over
  assert.deepEqual(tue.courses[0].meds.map(m => m.code), ["МА", "АЕ"]);
  assert.equal(mon.note, "сыпь на подбородке");
  assert.deepEqual(tue.journals, [{ name: "Skin", level: null, reasons: [], on: "2026-11-04" }]);
});

test("foodWeek: a task set puts its done days on the rows; no task, no field", () => {
  const days = ["2026-11-02", "2026-11-03"];
  const args = { items: [], dishes: [], marks: [], log: {}, journals: [], courses: [], days };
  const task = { id: "t5", name: "gym", days: new Set(["2026-11-02"]) };
  const [mon, tue] = foodWeek({ ...args, task });

  assert.deepEqual([mon.trained, tue.trained], [true, false]);
  assert.equal(foodWeek(args)[0].trained, undefined);
});

test("foodWeek: a medicine with ranges is off the course's gap days (days 3-4 here)", () => {
  const courses = [forFood("c1", { start: "2026-11-02", marks: {}, meds: [
    { name: "мастодинон", code: "МА", times: [], ranges: [{ from: 1, to: 2 }, { from: 5, to: 6 }] },
    { name: "аевит", code: "АЕ", times: [], ranges: [{ from: 1, to: 6 }] },
  ] })];
  const days = ["2026-11-02", "2026-11-04", "2026-11-06", "2026-11-08"];
  const rows = foodWeek({ items: [], dishes: [], marks: [...DEFAULT_MARKS], log: {}, journals: [], courses, days });

  assert.deepEqual(rows.map(r => r.courses.flatMap(c => c.meds.map(m => m.code))),
    [["МА", "АЕ"], ["АЕ"], ["МА", "АЕ"], []]);
});

test("recipe tags match the first configured tab regardless of case or a leading hash", () => {
  const tabs = [{ tag: "drink" }, { tag: "dessert" }];
  assert.equal(recipeCourse(["dessert", "#DrInK"], tabs), "drink");
  assert.equal(recipeCourse(["dessert", "#DrInK"], tabs.toReversed()), "dessert");
  assert.equal(recipeCourse("#DeSsErT", tabs), "dessert");
  assert.equal(recipeCourse(["drinks", "meal/drink"], tabs), null);
  assert.equal(recipeCourse(undefined, tabs), null);
  assert.equal(recipeCourse("drink", []), null);
});
