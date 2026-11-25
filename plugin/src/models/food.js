// The food page menu, recent choices and weekly journal rows.
import { addDays, diffDays } from "#/shared/lib/dates.js";
import { byName } from "#/shared/lib/find.js";
import { inRanges, rangesOf } from "#/shared/lib/ranges.js";
import { dayNote, eaten } from "#/entities/food-log/index.js";

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
