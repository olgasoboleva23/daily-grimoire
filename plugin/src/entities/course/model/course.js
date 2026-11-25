// Course records, intake schedules, daily marks and changes to the medication course.
import { Notice } from "obsidian";
import { addDays, todayYmd } from "#/shared/lib/dates.js";
import { formatRanges, inRanges, lastDay, rangesOf } from "#/shared/lib/ranges.js";
import { dayLabel, TIMES } from "./mark.js";
import {
  labelsOf, MEAL_TEXT, medicine, nameOf, normal, TIME_KEYS, timesOf, WHEN,
} from "./medicine.js";
import { courses, readCourses } from "./repository/courses.js";

const MEALS = [...Object.values(MEAL_TEXT), ""];

export const courseOf = (v, today) => ({
  start: v.start?.trim() || today, meds: normal(v.meds), notes: v.notes?.trim() ?? "",
  marks: {}, dayNotes: {},
});

export const edited = (rec, v) => ({
  ...rec, start: v.start?.trim() || rec.start, meds: normal(v.meds), notes: v.notes?.trim() ?? "",
});

export const formValues = rec => ({
  meds: rec.meds.map(g => ({
    ...g, ranges: formatRanges(rangesOf(g)),
    ...Object.fromEntries(TIME_KEYS.map(t => [t, timesOf(g.times).includes(WHEN[t][0])])),
  })),
  start: rec.start, notes: rec.notes,
});

// a column per medicine and time of day (once a day: no time), its key the marks are kept by
export const columns = meds => {
  const labels = labelsOf(meds);

  return meds.flatMap(m => {
    const times = timesOf(m.times), ranges = rangesOf(m);

    return (times.length ? times : [""]).map(time => ({
      key: m.code + time, code: labels.get(m.code), time,
      name: nameOf(m.name), ranges, days: lastDay(ranges),
    }));
  });
};

const courseDays = rec => Math.max(...columns(rec.meds).map(c => c.days));

const courseName = rec => rec.meds.map(m => nameOf(m.name)).join(", ");

const isRunning = (rec, today) =>
  rec.start <= today && today < addDays(rec.start, courseDays(rec));

// the day by its anchors (a time of day, a meal): what to take then, the doses
export const intake = meds => {
  const cols = meds.map(medicine)
    .flatMap(m => (m.times.length ? m.times : [""]).map(t => ({ m, t })));

  return Object.keys(TIMES).flatMap(t => MEALS.map(meal => {
    const take = cols.filter(c => c.t === t && c.m.meal === meal)
      .map(c => [c.m.name, c.m.dose].filter(Boolean).join(" "));

    return take.length ? `${[TIMES[t], meal].filter(Boolean).join(", ")}: ${take.join(", ")}` : "";
  })).filter(Boolean);
};

// what the block draws: a row per day from the start (a key the columns no longer have isn't
// shown or counted), the day of the course (0: before it; days + 1: after), today's doses
export function courseData(rec, today) {
  const cols = columns(rec.meds), days = courseDays(rec);
  const rows = Array.from({ length: days }, (_, i) => {
    const date = addDays(rec.start, i);

    return {
      date, label: dayLabel(date),
      when: date < today ? "past" : date === today ? "today" : "future",
      marks: cols.map(c => inRanges(c.ranges, i + 1) ? rec.marks[date]?.[c.key] ?? "☐" : ""),
      note: rec.dayNotes[date] ?? "",
    };
  });
  const at = rows.findIndex(r => r.when === "today"), now = rows[at];
  const groups = now && Object.entries(TIMES).map(([time, label]) => ({
    label,
    items: cols.flatMap((c, col) => c.time === time && now.marks[col]
      ? [{ col, key: c.key, name: c.name, mark: now.marks[col] }] : []),
  })).filter(g => g.items.length);
  const gone = rows.filter(r => r.when !== "future").flatMap(r => r.marks).filter(Boolean);

  return {
    columns: cols.map(({ days: _d, ranges: _r, ...c }) => c), rows, today: groups || null,
    day: at >= 0 ? at + 1 : rows[0].when === "past" ? days + 1 : 0,
    days, taken: gone.filter(m => m === "✅").length, due: gone.length,
  };
}

// a copy of `obj` with `key` set to `value`, or without it (`value` undefined)
const put = (obj = {}, key, value) => {
  const copy = { ...obj };

  if (value === undefined) delete copy[key];
  else copy[key] = value;
  return copy;
};

export const withMark = (rec, date, key, mark) => {
  const day = put(rec.marks[date], key, mark === "☐" ? undefined : mark);

  return { ...rec, marks: put(rec.marks, date, Object.keys(day).length ? day : undefined) };
};

export const withDayNote = (rec, date, text) =>
  ({ ...rec, dayNotes: put(rec.dayNotes, date, text.trim() || undefined) });

// the food page's view of a course: its medicines and by day the codes taken (a ✅ in any of
// their keys)
export function forFood(id, rec) {
  const labels = labelsOf(rec.meds);
  const code = Object.fromEntries(columns(rec.meds).map(c => [c.key, c.code]));

  return {
    id, name: courseName(rec), start: rec.start, days: courseDays(rec),
    meds: rec.meds.map(m => {
      const ranges = rangesOf(m);

      return { code: labels.get(m.code), name: nameOf(m.name), days: lastDay(ranges), ranges };
    }),
    taken: new Map(Object.entries(rec.marks).map(([date, marks]) => [date,
      new Set(Object.keys(marks).filter(k => marks[k] === "✅" && code[k]).map(k => code[k]))])),
  };
}

// the courses for the tabs: running first, then the newest start. A tab says the start date
// ("7 ноя", the name after it when another course starts that day); `title`: the whole name, a tip
export const courseList = (json, today) => {
  const date = rec => dayLabel(rec.start).split(",")[0];
  const same = rec => Object.values(json).filter(r => r.start === rec.start).length > 1;

  return Object.entries(json)
    .map(([id, rec]) => ({
      id, name: courseName(rec), start: rec.start,
      label: same(rec) ? `${date(rec)} · ${courseName(rec)}` : date(rec),
      title: `${courseName(rec)} · ${date(rec)}`,
      running: isRunning(rec, today),
    }))
    .sort((a, b) => b.running - a.running || b.start.localeCompare(a.start));
};

export const markDose = (id, date, key, mark) =>
  courses.update(id, r => withMark(r, date, key, mark));

export const setDayNote = (id, date, text) => courses.update(id, r => withDayNote(r, date, text));

export const createCourse = values => courses.add(courseOf(values, todayYmd()), "c");

const courseGone = () => new Notice("✦ that course is gone");

// before is JSON.stringify(formValues(record)); intake marks and day notes aren't part of it.
export async function saveCourse(id, values, before) {
  let changed = false;
  const saved = await courses.update(id, r => {
    changed = JSON.stringify(formValues(r)) !== before;
    return changed ? null : edited(r, values);
  });

  if (changed) {
    new Notice("✦ the course changed meanwhile: open its window again");
    return "changed";
  }

  if (!saved) {
    courseGone();
    return "gone";
  }

  return "saved";
}

export const readCourseList = async () => courseList(await readCourses(), todayYmd());
