// A medication course: a record of courses.json ({ start, meds, notes, marks: { date: { key:
// mark } }, dayNotes: { date: text } }, a key a medicine's code and its time of day) and what is
// derived from it: the columns, a row per day (☐ a due key with no mark, blank past a medicine's
// days), today's doses by time of day, the counts, the Приём lines, the window's form and values;
// a mark or a day's note set (a new record). Pure (tests/course.test.mjs).
import { addDays, weekday } from "#/helpers/dates.js";

export const MARKS = ["☐", "✅", "❌"];

export const next = mark => MARKS[(MARKS.indexOf(mark) + 1) % MARKS.length];

export const TIMES = { "☀️": "☀️ утро", "🌤": "🌤 днём", "🌙": "🌙 на ночь", "": "в любое время" };
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export const dayLabel = date =>
  `${+date.slice(8, 10)} ${MONTHS[+date.slice(5, 7) - 1]}, ${DAYS[weekday(date) - 1]}`;

// the medicines of a course, a group each in the window: the name, the dose ("30 капель"; none:
// the words from the first number of the name), times (morning / day / evening, a dose each;
// none: once at any time), the meal (before | after | sleep | any), days
const WHEN = { morning: ["☀️"], day: ["🌤"], evening: ["🌙"] };
const TIME_KEYS = ["morning", "day", "evening"];
const timesOf = (times = []) => times.flatMap(t => WHEN[t] ?? []);
const MEAL_TEXT = { before: "перед едой", after: "после еды", sleep: "перед сном" };
const MEALS = [...Object.values(MEAL_TEXT), ""];
const pairs = list => list.map(([label, value]) => ({ label, value }));

// a name as typed may carry the dose ("Мастодинон 30 капель"): the words before its first number
const parts = typed => {
  const words = typed.trim().split(/\s+/), at = words.findIndex(w => /^\d/.test(w));

  return at < 0 ? [words.join(" "), ""] : [words.slice(0, at).join(" "), words.slice(at).join(" ")];
};

export const nameOf = typed => parts(typed)[0];

// A unique code per medicine; stored codes keep marks connected through renames and reordering.
export const withCodes = groups => {
  const taken = new Set(groups.map(g => g.code).filter(Boolean));

  return groups.map(g => {
    if (g.code) return g;
    const n = nameOf(g.name).toUpperCase().replace(/[^\p{L}\p{N}]/gu, "");
    const tries = [...n.slice(1)].map(c => n[0] + c)
      .concat(Array.from({ length: 9 }, (_, i) => n.slice(0, 2) + (i + 2)));
    const code = tries.find(c => !taken.has(c)) ?? n.slice(0, 2);

    taken.add(code);
    return { ...g, code };
  });
};

// Visible abbreviations follow current names; stored codes remain the keys of the history.
const labelsOf = meds => new Map(withCodes(meds.map(({ name }) => ({ name })))
  .map((m, i) => [meds[i].code, m.code]));

export const medicine = g => {
  const [name, dose] = parts(g.name);

  return {
    name, dose: g.dose?.trim() || dose, times: timesOf(g.times),
    meal: MEAL_TEXT[g.meal] ?? "", ranges: rangesOf(g), code: g.code,
  };
};

// the window of a course, a group per medicine (+ adds one)
export const courseForm = () => ({
  rows: [
    {
      name: "Medicines", key: "meds", required: ["name"],
      list: [
        { name: "Name", key: "name", text: "Мастодинон" },
        { name: "Dose", key: "dose", text: "30 капель" },
        { name: "Утром", key: "morning", check: "Ничего не отмечено — один приём в любое время" },
        { name: "Днём", key: "day", check: "" },
        { name: "Вечером", key: "evening", check: "" },
        {
          name: "Meal", key: "meal",
          options: pairs([
            ["перед едой", "before"], ["после еды", "after"], ["перед сном", "sleep"],
            ["неважно", "any"],
          ]),
        },
        { name: "Days", key: "ranges", text: "1-30, 45-60 (empty: 1-90)" },
      ],
    },
    { name: "Start", key: "start", text: "YYYY-MM-DD (empty: today)" },
    {
      name: "Notes", key: "notes", text: "доп. информация: от врача, как принимать…",
      lines: true,
    },
  ],
  values: {}, required: ["meds"],
});

// the medicines as the record keeps them: as typed, a code each
const normal = meds => withCodes(meds).map(g => ({
  name: g.name, code: g.code, dose: g.dose ?? "", times: TIME_KEYS.filter(t => g[t]),
  meal: g.meal ?? "any",
  ranges: typeof g.ranges === "string" || Array.isArray(g.ranges)
    ? parseRanges(g.ranges) : rangesOf(g),
}));

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

export const courseDays = rec => Math.max(...columns(rec.meds).map(c => c.days));

export const courseName = rec => rec.meds.map(m => nameOf(m.name)).join(", ");

export const isRunning = (rec, today) =>
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

// the courses for the tabs: running first, then the newest start
export const courseList = (json, today) => Object.entries(json)
  .map(([id, rec]) => ({
    id, name: courseName(rec), start: rec.start,
    label: `${courseName(rec)} · ${dayLabel(rec.start).split(",")[0]}`,
    running: isRunning(rec, today),
  }))
  .sort((a, b) => b.running - a.running || b.start.localeCompare(a.start));

// ranges of a medicine: [{ from, to }] course days (1-based); old records: days → 1..days
export const rangesOf = m =>
  Array.isArray(m.ranges) && m.ranges.length
    ? m.ranges
    : [{ from: 1, to: Number(m.days) || 90 }];

const MAX_DAY = 365;
const RANGE = /^(\d+)\s*(?:[-–—]\s*(\d+))?$/;
const partsOf = input => String(input ?? "").split(/[,;]/).map(p => p.trim()).filter(Boolean);

// "30" or "45-60": course days from 1 up to MAX_DAY; else null
const rangeOf = part => {
  const m = part.match(RANGE);
  const from = m && +m[1], to = m && (m[2] ? +m[2] : from);

  return m && from >= 1 && to >= from && to <= MAX_DAY ? { from, to } : null;
};

// the first part of a typed list that isn't a range of course days, else null
export const rangesProblem = input => partsOf(input).find(p => !rangeOf(p)) ?? null;

// the window's problem with the days of a medicine, else null
export const courseProblem = v => {
  for (const g of v.meds ?? []) {
    const bad = rangesProblem(g.ranges);

    if (bad) {
      return `days of «${g.name}»: can't read «${bad}» (like 1-30, 45-60, 70; up to ${MAX_DAY})`;
    }
  }

  return null;
};

// "1-30, 45-60, 70" → [{from:1,to:30},{from:45,to:60},{from:70,to:70}], sorted, merged if touching;
// nothing readable: 1-90
export const parseRanges = input => {
  const found = (Array.isArray(input) ? input.filter(r => r.from >= 1 && r.to >= r.from)
    : partsOf(input).map(rangeOf).filter(Boolean)).sort((a, b) => a.from - b.from);
  const merged = [];

  for (const r of found) {
    const last = merged[merged.length - 1];

    if (last && r.from <= last.to + 1) last.to = Math.max(last.to, r.to);
    else merged.push({ ...r });
  }

  return merged.length ? merged : [{ from: 1, to: 90 }];
};

export const formatRanges = ranges =>
  ranges.map(r => (r.from === r.to ? `${r.from}` : `${r.from}-${r.to}`)).join(", ");

export const inRanges = (ranges, day) => ranges.some(r => day >= r.from && day <= r.to);

const lastDay = ranges => Math.max(...ranges.map(r => r.to));
