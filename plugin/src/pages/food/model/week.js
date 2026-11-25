// Match food, training, journal and course entries to the visible days of a week.
import { addDays, diffDays } from "#/shared/lib/dates.js";
import { inRanges, rangesOf } from "#/shared/lib/ranges.js";
import { dayNote, eaten } from "#/entities/food-log/index.js";
import { menu } from "./menu.js";

// journals: [{ path, name, lag, entries: Map date → { level, reasons } }]; courses: [{ id, name,
// start, days, meds: [{ code, name, days }], taken: Map date → the codes with a ✅ that day }]
// task: { id, name, days: Set of the dates it was done } or null: each row then says `trained`
// log: log.json's object
export function foodWeek({ items, dishes, marks, log, journals, courses, days, task = null }) {
  const byId = menu({ items, dishes, marks }, true);

  return days.map(date => {
    const foods = eaten(log, date).map(id => byId.get(id) ?? {
      id, kind: id.startsWith("d") ? "dish" : "item", name: id, marks: [], icons: "",
    });
    const all = foods.flatMap(f => f.marks);
    const items = foods.map(({ id, kind, name, icons }) => ({ id, kind, name, icons }));

    return {
      date, items, note: dayNote(log, date), ...(task && { trained: task.days.has(date) }),
      counts: Object.fromEntries(marks.map(m => [m.tag, all.filter(t => t === m.tag).length])),
      journals: journals.map(j => {
        const on = addDays(date, j.lag), e = j.entries.get(on);

        return { name: j.name, level: e?.level ?? null, reasons: e?.reasons ?? [], on };
      }),
      // a course on that day, its medicines still on then (each its own days)
      courses: courses.filter(c => c.start <= date && date < addDays(c.start, c.days)).map(c => ({
        id: c.id, name: c.name,
        meds: (c.meds ?? []).filter(m => inRanges(rangesOf(m), diffDays(date, c.start) + 1))
          .map(m => ({ code: m.code, name: m.name, taken: !!c.taken?.get(date)?.has(m.code) })),
      })),
    };
  });
}
