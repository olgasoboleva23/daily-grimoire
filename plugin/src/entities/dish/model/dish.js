// A dish with its product names, alternative ingredients and food marks.
import { Notice } from "obsidian";
import { byName } from "#/shared/lib/find.js";
import { dishes, write } from "./repository/dishes.js";
import { record } from "../contract/dish.js";

export class Dish {
  static list({ items, dishes }) {
    const products = new Map(items.map(p => [p.id, p]));

    return dishes.map(d => new Dish(d, products)).sort(byName);
  }

  constructor(d, products) {
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

    Object.assign(this, d, { ingredients, marks: [...marks], missing });
  }
}

export const ingredientText = i =>
  i.alt.length ? `${i.name} / ${i.alt.map(a => a.name).join(" + ")}` : i.name;

export const addDish = values => write(() => {
  const next = record(values);

  return next ? dishes.add(next, "d") : null;
});

export const editDish = (id, values, { before, offeredTypes } = {}) => write(async () => {
  const saved = await dishes.update(id, current => {
    if (current.deleted || (before && JSON.stringify(current) !== before)) return null;
    // An unlisted type looks empty in Recipes. Saving other fields keeps its stored key.
    const keepType = !values.type && current.type && offeredTypes
      && !offeredTypes.includes(current.type);
    const type = keepType ? current.type : values.type;
    const next = record({ ...values, type });

    return next && { ...current, ...next };
  });

  if (!saved && before) new Notice("✦ dish could not be saved. Open it again to edit.");
  return saved;
});

export const removeDish = id => write(() =>
  dishes.update(id, current => current.deleted ? null : { ...current, deleted: true }));
