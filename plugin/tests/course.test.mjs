import { test } from "node:test";
import assert from "node:assert/strict";
import {
  columns, courseData, courseForm, courseList, courseOf, courseProblem, dayLabel, edited, forFood,
  formValues, inRanges, intake, next, parseRanges, rangesProblem, withDayNote, withMark,
} from "#/models/course.js";

test("a mark goes round ☐ → ✅ → ❌ → ☐; a day's label in Russian", () => {
  assert.deepEqual(["☐", "✅", "❌"].map(next), ["✅", "❌", "☐"]);
  assert.equal(dayLabel("2026-11-08"), "8 ноя, вс");
  assert.equal(dayLabel("2027-02-04"), "4 фев, чт");
});

// a course as a record (courses.json): made-up medicines, two days ticked, a stray key
const REC = {
  start: "2026-11-07",
  meds: [
    { name: "Аевит", code: "АЕ", dose: "1 таблетка", times: [], meal: "after", days: 2 },
    { name: "Магний 2 таблетки", code: "МГ", dose: "", times: ["morning", "evening"], meal: "before", days: 3 },
  ],
  notes: "",
  marks: {
    "2026-11-07": { "АЕ": "✅", "МГ☀️": "✅", "МГ🌙": "❌" },
    "2026-11-08": { "МГ☀️": "✅", "ХХ": "✅" },
  },
  dayNotes: { "2026-11-08": "сегодня" },
};

test("a record's course: a column per medicine and time, a row per day, today's groups, counts", () => {
  assert.deepEqual(columns(REC.meds).map(c => c.key), ["АЕ", "МГ☀️", "МГ🌙"]);
  const d = courseData(REC, "2026-11-08");

  assert.equal(d.rows.length, 3);
  assert.deepEqual(d.rows[2].marks, ["", "☐", "☐"]);   // Аевит's 2 days are over
  assert.deepEqual(d.rows[1].marks, ["☐", "✅", "☐"]);
  assert.equal(d.rows[1].note, "сегодня");
  assert.deepEqual(d.rows.map(r => r.when), ["past", "today", "future"]);
  assert.deepEqual(d.columns[1], { key: "МГ☀️", code: "МА", time: "☀️", name: "Магний" });
  // the stray ХХ isn't counted
  assert.deepEqual([d.day, d.days, d.taken, d.due], [2, 3, 3, 6]);
  assert.deepEqual(d.today.map(g => g.label), ["☀️ утро", "🌙 на ночь", "в любое время"]);
  assert.deepEqual(d.today[0].items, [{ col: 1, key: "МГ☀️", name: "Магний", mark: "✅" }]);
  // before and after the course
  assert.deepEqual([courseData(REC, "2026-11-01").day, courseData(REC, "2026-11-01").today], [0, null]);
  assert.deepEqual([courseData(REC, "2026-11-20").day, courseData(REC, "2026-11-20").today], [4, null]);
});

test("withMark / withDayNote: a new record; ☐ or an empty text deletes, an empty day goes", () => {
  const copy = structuredClone(REC);

  assert.deepEqual(withMark(REC, "2026-11-08", "МГ☀️", "☐").marks["2026-11-08"], { "ХХ": "✅" });
  assert.deepEqual(withMark(REC, "2026-11-09", "АЕ", "✅").marks["2026-11-09"], { "АЕ": "✅" });
  const one = withMark(REC, "2026-11-09", "АЕ", "✅");

  assert.equal("2026-11-09" in withMark(one, "2026-11-09", "АЕ", "☐").marks, false);
  assert.equal("2026-11-08" in withDayNote(REC, "2026-11-08", "  ").dayNotes, false);
  assert.equal(withDayNote(REC, "2026-11-09", " тошнило ").dayNotes["2026-11-09"], "тошнило");
  assert.deepEqual(REC, copy);
});

test("intake: the Приём lines by time of day and meal, the doses", () => {
  assert.deepEqual(intake(REC.meds), [
    "☀️ утро, перед едой: Магний 2 таблетки",
    "🌙 на ночь, перед едой: Магний 2 таблетки",
    "в любое время, после еды: Аевит 1 таблетка",
  ]);
});

test("time checkboxes: every selected time is one dose; none is one unrestricted dose", () => {
  const cases = [
    [{}, ["ТЕ"]],
    [{ morning: true }, ["ТЕ☀️"]],
    [{ day: true }, ["ТЕ🌤"]],
    [{ evening: true }, ["ТЕ🌙"]],
    [{ morning: true, day: true }, ["ТЕ☀️", "ТЕ🌤"]],
    [{ morning: true, evening: true }, ["ТЕ☀️", "ТЕ🌙"]],
    [{ day: true, evening: true }, ["ТЕ🌤", "ТЕ🌙"]],
    [{ morning: true, day: true, evening: true }, ["ТЕ☀️", "ТЕ🌤", "ТЕ🌙"]],
  ];

  for (const [checked, keys] of cases) {
    const rec = courseOf({ meds: [{ name: "Тест", days: 1, ...checked }] }, "2026-11-13");
    const data = courseData(rec, "2026-11-13");

    assert.deepEqual(data.columns.map(c => c.key), keys);
    assert.equal(data.due, keys.length);
    assert.equal(data.today.flatMap(g => g.items).length, keys.length);
    assert.equal(intake(rec.meds).length, keys.length);
  }
});

test("course times reopen as checkboxes and keep the existing mark keys after saving", () => {
  const values = formValues(REC);

  assert.deepEqual([values.meds[0].morning, values.meds[0].day, values.meds[0].evening],
    [false, false, false]);
  assert.deepEqual([values.meds[1].morning, values.meds[1].day, values.meds[1].evening],
    [true, false, true]);
  const saved = edited(REC, values);

  assert.deepEqual(saved.meds.map(m => m.times), [[], ["morning", "evening"]]);
  assert.deepEqual(courseData(saved, "2026-11-08"), courseData(REC, "2026-11-08"));
  assert.deepEqual(forFood("c1", saved), forFood("c1", REC));
  assert.deepEqual(formValues(saved), { ...values, meds: values.meds.map(({ days: _, ...m }, i) =>
    ({ ...m, times: saved.meds[i].times })) });
});

test("courseOf / edited: the window's values as a record, the marks kept through an edit", () => {
  assert.deepEqual(courseOf({ meds: [{ name: "Мастодинон 30 капель" }] }, "2026-11-10"), {
    start: "2026-11-10",
    meds: [{
      name: "Мастодинон 30 капель", code: "МА", dose: "", times: [], meal: "any",
      ranges: [{ from: 1, to: 90 }],
    }],
    notes: "", marks: {}, dayNotes: {},
  });
  const meds = formValues(REC).meds.map(m => ({ ...m, dose: "3 капли" }));
  const rec = edited(REC, { meds, start: "", notes: "x" });

  assert.deepEqual([rec.start, rec.notes, rec.meds[0].dose], ["2026-11-07", "x", "3 капли"]);
  assert.deepEqual([rec.marks, rec.dayNotes], [REC.marks, REC.dayNotes]);
});

test("courseOf / edited: a code per medicine, unique, kept through a rename; the window's rows", () => {
  const three = [{ name: "Мастодинон" }, { name: "Магний" }, { name: "Масло" }];
  const rec = courseOf({ meds: three }, "2026-11-08");

  assert.deepEqual(rec.meds.map(m => m.code), ["МА", "МГ", "МС"]);
  const again = edited(rec, { meds: [
    { name: "Магний цитрат", code: "МГ" }, { name: "Мастодинон", code: "МА" }, { name: "Мелатонин" },
  ] });

  assert.deepEqual(again.meds.map(m => m.code), ["МГ", "МА", "МЕ"]);
  const { rows, required } = courseForm();

  assert.deepEqual(rows.map(r => r.key), ["meds", "start", "notes"]);
  assert.deepEqual(rows[0].list.map(r => r.key),
    ["name", "dose", "morning", "day", "evening", "meal", "ranges"]);
  assert.deepEqual([rows[0].required, required, rows[2].lines], [["name"], ["meds"], true]);
  assert.deepEqual(rows[0].list[5].options.map(o => o.label),
    ["перед едой", "после еды", "перед сном", "неважно"]);
});

test("forFood: the codes taken by day; courseList: running first, then the newest", () => {
  const food = forFood("c1", REC);

  assert.deepEqual(food.taken.get("2026-11-07"), new Set(["АЕ", "МА"]));
  assert.deepEqual([food.id, food.name, food.days], ["c1", "Аевит, Магний", 3]);
  const list = courseList({
    c1: REC, c2: { ...REC, start: "2026-11-09" }, c3: { ...REC, start: "2026-10-01" },
  }, "2026-11-08");

  assert.deepEqual(list.map(c => c.id), ["c1", "c2", "c3"]);
  assert.deepEqual(list.map(c => c.running), [true, false, false]);
  assert.equal(list[0].label, "Аевит, Магний · 7 ноя");
});

test("renaming a medicine updates its labels while table and Food retain its marked history", () => {
  const original = {
    start: "2026-11-13", notes: "", dayNotes: {},
    meds: [
      { name: "Новопассит", code: "НО", times: ["evening"], days: 2 },
      { name: "Валериана", code: "ВА", times: ["evening"], days: 2 },
    ],
    marks: { "2026-11-13": { "НО🌙": "✅", "ВА🌙": "❌" } },
  };
  const values = formValues(original);
  values.meds[0].name = "Валериана форте";
  const renamed = edited(original, values);
  const data = courseData(renamed, "2026-11-13");
  assert.deepEqual(data.columns.map(c => [c.key, c.code]), [["НО🌙", "ВА"], ["ВА🌙", "ВЛ"]]);
  assert.deepEqual(data.rows[0].marks, ["✅", "❌"]);
  assert.deepEqual(renamed.marks, original.marks);
  const food = forFood("c1", renamed);
  assert.deepEqual(food.meds.map(m => m.code), ["ВА", "ВЛ"]);
  assert.deepEqual(food.taken.get("2026-11-13"), new Set(["ВА"]));
  const toggled = withMark(renamed, "2026-11-14", data.columns[0].key, "✅");
  assert.equal(toggled.marks["2026-11-14"]["НО🌙"], "✅");
});

test("ranges: typed days read, sorted and merged; a gap is a gap; nothing readable: 1-90", () => {
  assert.deepEqual(parseRanges("45-60, 1-30; 70, 31"),
    [{ from: 1, to: 31 }, { from: 45, to: 60 }, { from: 70, to: 70 }]);
  assert.deepEqual(parseRanges("10-20, 15-25"), [{ from: 10, to: 25 }]);
  assert.deepEqual(parseRanges(""), [{ from: 1, to: 90 }]);
  assert.deepEqual(parseRanges([{ from: 5, to: 6 }, { from: 1, to: 2 }]),
    [{ from: 1, to: 2 }, { from: 5, to: 6 }]);
  assert.equal(inRanges(parseRanges("1-30, 45-60"), 31), false);
  assert.equal(inRanges(parseRanges("1-30, 45-60"), 45), true);
});

test("ranges: the first part that isn't days 1-365 is the problem; the window names the medicine", () => {
  assert.equal(rangesProblem("1-30, 45-60"), null);
  assert.equal(rangesProblem(""), null);
  assert.equal(rangesProblem("1-3O"), "1-3O");
  assert.equal(rangesProblem("1-30, 5-3"), "5-3");
  assert.equal(rangesProblem("0-5"), "0-5");
  assert.equal(rangesProblem("1-100000"), "1-100000");
  assert.match(courseProblem({ meds: [{ name: "Аевит", ranges: "1-30" }, { name: "Магний", ranges: "x" }] }),
    /«Магний».*«x»/);
  assert.equal(courseProblem({ meds: [{ name: "Аевит", ranges: "1-30" }] }), null);
});

test("ranges: the grid is blank on the days a medicine is not taken; the course runs to the last", () => {
  const rec = courseOf({ meds: [{ name: "Тест", ranges: "1-2, 4-5" }] }, "2026-11-08");
  const data = courseData(rec, "2026-11-08");

  assert.deepEqual(data.rows.map(r => r.marks[0]), ["☐", "☐", "", "☐", "☐"]);
  assert.equal(data.days, 5);
  assert.deepEqual(rec.meds[0].ranges, [{ from: 1, to: 2 }, { from: 4, to: 5 }]);
  assert.equal(formValues(rec).meds[0].ranges, "1-2, 4-5");
  assert.equal(data.due, 1);
  const food = forFood("c1", rec);

  assert.deepEqual([food.days, food.meds[0].days, food.meds[0].ranges.length], [5, 5, 2]);
});

test("ranges: an old record with days: N reads as 1..N and is shown as such in the window", () => {
  const old = { start: "2026-11-08", notes: "", marks: {}, dayNotes: {}, meds: [{ name: "Тест", code: "ТЕ", days: 3 }] };

  assert.equal(formValues(old).meds[0].ranges, "1-3");
  assert.equal(courseData(old, "2026-11-08").days, 3);
});
