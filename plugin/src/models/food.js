// The food journal (pure; tests/food.test.mjs). The products are the market's items of type
// food (Market/items.json: { name, type, marks: [tag] }); a dish (dishes.json: { name, type,
// ingredients: [{ item, amount, alt?: [{ item, amount }] }], link }) uses its main products' marks.
// food.json: the marks ({ tag, icon, name }: a tag kept once made, so a mark renamed keeps its
// products) and the training task's id. log.json: a day by date, { eaten: [product or dish id],
// note }; a day with nothing eaten and no note isn't kept. The picker's order: recently eaten
// first. The week's rows for the food page: what was eaten with its marks' icons, the marks
// counted, each free journal's level after its lag (a rash shows the next day), the medication
// courses on that day, the note.
import { addDays, diffDays } from "#/shared/lib/dates.js";
import { byName } from "#/shared/lib/find.js";
import { inRanges, rangesOf } from "#/shared/lib/ranges.js";

export const DEFAULT_MARKS = [
  { tag: "m1", icon: "🍫", name: "какао" },
  { tag: "m2", icon: "🥛", name: "молоко" },
  { tag: "m3", icon: "🥛↓", name: "безлактозное молоко" },
];

export const marksOf = data => data.marks ?? DEFAULT_MARKS;

export function dishList({ items, dishes }) {
  const products = new Map(items.map(p => [p.id, p]));

  return dishes.map(d => {
    const marks = new Set();
    let missing = false;
    const ingredients = d.ingredients.map(({ item, amount, alt }) => {
      const product = products.get(item);
      const alternatives = (Array.isArray(alt) ? alt : []).map(({ item, amount }) => {
        const replacement = products.get(item);

        if (!replacement) missing = true;
        return { item, amount, name: replacement?.name ?? item };
      });

      if (!product) missing = true;
      for (const tag of product?.marks ?? []) marks.add(tag);
      return { item, amount, name: product?.name ?? item, alt: alternatives };
    });

    return { ...d, ingredients, marks: [...marks], missing };
  }).sort(byName);
}

function menu(data) {
  const icons = new Map(data.marks.map(m => [m.tag, m.icon]));
  const entries = [...data.items, ...dishList(data)];

  return new Map(entries.map(f => [f.id, {
    id: f.id, kind: f.ingredients ? "dish" : "item", name: f.name,
    ingredients: f.ingredients?.map(i =>
      i.alt.length ? `${i.name} / ${i.alt.map(a => a.name).join(" + ")}` : i.name) ?? [],
    marks: f.marks,
    icons: f.marks.map(tag => icons.get(tag) ?? "").join(""),
  }]));
}

export function foodChoices({ items, dishes, marks, log, today }) {
  const counts = new Map(), last = new Map(), since = addDays(today, -6);

  for (const [day, entry] of Object.entries(log)) {
    for (const id of new Set(entry.eaten)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if (day >= since && day <= today && day > (last.get(id) ?? "")) last.set(id, day);
    }
  }

  return [...menu({ items, dishes, marks }).values()].sort((a, b) =>
    (last.get(b.id) ?? "").localeCompare(last.get(a.id) ?? "")
      || (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || byName(a, b))
    .map(({ id, kind, name, ingredients, icons }) =>
      ({ id, kind, name, ingredients, icons, recent: last.has(id) }));
}

export const withMarks = (data, marks) => ({ ...data, marks });

export const withTask = (data, id) => ({ ...data, task: id });

export const eaten = (log, date) => log[date]?.eaten ?? [];

export const dayNote = (log, date) => log[date]?.note ?? "";

// the log with the day set; an empty one dropped
function withDay(log, date, day) {
  if (day.eaten.length || day.note) return { ...log, [date]: day };
  const rest = { ...log };

  delete rest[date];
  return rest;
}

export const withEaten = (log, date, id) =>
  withDay(log, date, { eaten: [...eaten(log, date), id], note: dayNote(log, date) });

// the day's n-th eaten taken off (out of range: the log as it was)
export function withoutEaten(log, date, n) {
  const list = eaten(log, date);

  if (n < 0 || n >= list.length) return log;
  return withDay(log, date, { eaten: list.filter((_, i) => i !== n), note: dayNote(log, date) });
}

export const withNote = (log, date, text) =>
  withDay(log, date, { eaten: eaten(log, date), note: text.trim() });

// journals: [{ path, name, lag, entries: Map date → { level, reasons } }]; courses: [{ id, name,
// start, days, meds: [{ code, name, days }], taken: Map date → the codes with a ✅ that day }]
// task: { id, name, days: Set of the dates it was done } or null: each row then says `trained`
// log: log.json's object
export function foodWeek({ items, dishes, marks, log, journals, courses, days, task = null }) {
  const byId = menu({ items, dishes, marks });

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
