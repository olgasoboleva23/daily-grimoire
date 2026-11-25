// Medication course writes and the course picker against an in-memory vault.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vault } from "./stubs/vault.mjs";
import {
  createCourse, loadMeds, readCourse, saveCourse, setDayNote, tickMeds,
} from "#/controllers/meds.js";
import { Search } from "#/components/uikit/Search/index.ts";
import { pickCourse } from "#/components/windows/meds/CourseWindow/open.js";
import { formValues } from "#/models/course.js";
import { COURSES } from "#/helpers/paths.js";
import { Notice } from "obsidian";

globalThis.window ??= {};
window.moment = () => ({ format: () => "2026-11-08" });

// a course as a record (made-up medicines), as in course.test.mjs
const REC = {
  start: "2026-11-07",
  meds: [
    { name: "Аевит", code: "АЕ", dose: "1 таблетка", times: [],
      meal: "after", ranges: [{ from: 1, to: 2 }] },
    { name: "Магний 2 таблетки", code: "МГ", dose: "", times: ["morning", "evening"],
      meal: "before", ranges: [{ from: 1, to: 3 }] },
  ],
  notes: "",
  marks: {
    "2026-11-07": { "АЕ": "✅", "МГ☀️": "✅", "МГ🌙": "❌" },
    "2026-11-08": { "МГ☀️": "✅" },
  },
  dayNotes: { "2026-11-08": "сегодня" },
};
const stored = recs => vault({ [COURSES]: JSON.stringify(recs, null, 2) });
const read = files => JSON.parse(files[COURSES]);

test("tickMeds and setDayNote save the day's data and keep the medicines", async () => {
  const { files } = stored({ c1: REC });

  assert.equal(await tickMeds("c1", "2026-11-08", "АЕ", "✅"), true);
  assert.equal(read(files).c1.marks["2026-11-08"].АЕ, "✅");
  assert.deepEqual(read(files).c1.meds, REC.meds);
  await setDayNote("c1", "2026-11-08", "");
  assert.equal("2026-11-08" in read(files).c1.dayNotes, false);
});

test("tickMeds: a courses.json that isn't JSON rejects, its text untouched", async () => {
  const { files } = vault({ [COURSES]: "{ broken" });

  await assert.rejects(tickMeds("c1", "2026-11-08", "АЕ", "✅"));
  assert.equal(files[COURSES], "{ broken");
});

test("saveCourse updates the dose and keeps the recorded marks and day notes", async () => {
  const { files } = stored({ c1: REC });
  const values = formValues(await readCourse("c1"));
  const before = JSON.stringify(values);
  const meds = values.meds.map(m => m.code === "МГ" ? { ...m, dose: "1 таблетка" } : m);

  assert.equal(await saveCourse("c1", { ...values, meds }, before), "saved");
  const c1 = read(files).c1;

  assert.equal(c1.meds[1].dose, "1 таблетка");
  assert.deepEqual([c1.marks, c1.dayNotes], [REC.marks, REC.dayNotes]);
});

test("saveCourse reports a deleted course and leaves the file unchanged", async () => {
  const { files } = stored({ c1: REC, c2: REC });
  Notice.last = "";
  const values = formValues(await readCourse("c1"));
  const before = JSON.stringify(values);
  const remaining = files[COURSES] = JSON.stringify({ c2: REC });

  assert.equal(await readCourse("c1"), null);
  assert.equal(await saveCourse("c1", values, before), "gone");
  assert.equal(files[COURSES], remaining);
  assert.equal(Notice.last, "✦ that course is gone");
});

test("saveCourse rejects a stale edit and keeps the newer dose", async () => {
  const { files } = stored({ c1: REC });
  const values = formValues(await readCourse("c1"));
  const before = JSON.stringify(values);
  const newer = structuredClone(REC);
  newer.meds[1].dose = "новая доза";
  files[COURSES] = JSON.stringify({ c1: newer });

  assert.equal(await saveCourse("c1", { ...values, notes: "из старого окна" }, before), "changed");
  assert.deepEqual(read(files).c1, newer);
  assert.match(Notice.last, /course changed meanwhile/);
});

test("saveCourse preserves marks and day notes added since reading the course", async () => {
  const { files } = stored({ c1: REC });
  const values = formValues(await readCourse("c1"));
  const before = JSON.stringify(values);

  await tickMeds("c1", "2026-11-08", "МГ🌙", "✅");
  await setDayNote("c1", "2026-11-08", "новая заметка дня");
  const next = { ...values, notes: "новая заметка курса" };
  assert.equal(await saveCourse("c1", next, before), "saved");
  const saved = read(files).c1;

  assert.equal(saved.notes, "новая заметка курса");
  assert.equal(saved.marks["2026-11-08"]["МГ🌙"], "✅");
  assert.equal(saved.dayNotes["2026-11-08"], "новая заметка дня");
});

test("createCourse returns a new ID and writes the course with today's default start", async () => {
  const { files } = stored({ c1: REC });
  const values = { meds: [{ name: "Чай", morning: true, ranges: "1-3" }], notes: " Test " };
  const id = await createCourse(values);

  assert.equal(id, "c2");
  const saved = await readCourse(id);
  assert.equal(saved.start, "2026-11-08");
  assert.equal(saved.notes, "Test");
  assert.deepEqual(saved.meds[0].times, ["morning"]);
  assert.deepEqual(saved.meds[0].ranges, [{ from: 1, to: 3 }]);
  assert.deepEqual(read(files).c1, REC);
});

test("pickCourse opens the search only when there are several courses", async t => {
  vault();
  assert.equal(await pickCourse(), null);
  assert.equal(Notice.last, "✦ no medication course yet");
  let calls = 0;
  t.mock.method(Search, "pick", async (_app, title, choices) => {
    assert.equal(title, "Which course…");
    calls++;
    return choices("")[1];
  });

  stored({ c1: REC });
  assert.equal(await pickCourse(), "c1");
  assert.equal(calls, 0);
  stored({ c1: REC, c2: { ...REC, start: "2026-10-01" } });
  assert.equal(await pickCourse(), "c2");
  assert.equal(calls, 1);
});

test("loadMeds: no courses.json: nothing", async () => {
  vault();
  assert.deepEqual(await loadMeds(), { list: [], data: {}, notes: {}, intake: {} });
});
