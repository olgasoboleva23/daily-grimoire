// The food page menu, recent choices and weekly journal rows.
import { addDays } from "#/shared/lib/dates.js";
import { Dish, ingredientText } from "#/entities/dish/index.js";
import { byName } from "#/shared/lib/find.js";

export function menu(data, includeDeleted = false) {
  const icons = new Map(data.marks.map(m => [m.tag, m.icon]));
  const items = includeDeleted ? data.items : data.items.filter(i => !i.deleted);
  const dishes = includeDeleted ? data.dishes : data.dishes.filter(d => !d.deleted);
  const entries = [...items, ...Dish.list({ items, dishes })];

  return new Map(entries.map(f => [f.id, {
    id: f.id, kind: f.ingredients ? "dish" : "item",
    name: f.deleted ? `${f.name} (deleted)` : f.name,
    ingredients: f.ingredients?.map(ingredientText) ?? [],
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
