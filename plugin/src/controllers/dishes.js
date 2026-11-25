// Reads the food catalog and saves dishes with product IDs, amounts and an optional recipe link.
// Display names and marks come from the market rather than the stored dish.
import { shallowReactive } from "vue";
import { Notice, prepareFuzzySearch } from "obsidian";
import { collection } from "#/helpers/collection.js";
import { nextId } from "#/helpers/ids.js";
import { readJson, serial } from "#/helpers/files.js";
import { DISHES, FOOD_DATA, FOOD_LOG, MARKET_RECORDS } from "#/helpers/paths.js";
import config from "#/helpers/config.js";
import { dishList, marksOf } from "#/models/food.js";
import { validNoteLink } from "./journal.js";
import { createNote } from "./notes.js";
import { KINDS } from "#/models/kinds.js";
import { productsToList } from "./widgets/market.js";
import { Search } from "#/components/uikit/Search/index.ts";

export { productsToList };
// The open Recipes page computes its tabs from this array; applyConfig updates it in place.
config.dishTypes = shallowReactive(config.dishTypes);

const dishes = collection(DISHES), write = serial();
const rows = records => Object.entries(records).map(([id, r]) => ({ ...r, id }));

export const readDish = async id => (await readJson(DISHES, {}))[id] ?? null;

export async function readProducts() {
  return rows(await readJson(MARKET_RECORDS, {})).filter(p => p.type === "food")
    .map(({ id, name, marks }) => ({ id, name, marks: marks ?? [] }));
}

export async function readFoodCatalog() {
  const [items, raw, food] = await Promise.all([
    readProducts(), readJson(DISHES, {}), readJson(FOOD_DATA, {}),
  ]);

  return {
    items: items.map(p => ({ ...p, type: "food" })),
    dishes: rows(raw), marks: marksOf(food), task: food.task,
  };
}

export async function loadRecipes() {
  const data = await readFoodCatalog();

  const types = new Set(config.dishTypes.map(t => t.key));
  const dishes = dishList(data).map(dish => ({
    ...dish, type: types.has(dish.type) ? dish.type : "",
  }));

  return { items: data.items, marks: data.marks, dishes };
}

function record({ name, type = "", ingredients, link = "" }) {
  if (!name?.trim() || !ingredients?.length || ingredients.some(i => !i.item)) return null;
  if (!validNoteLink(link)) return null;
  return { name: name.trim(), type: type.trim(), link,
    ingredients: ingredients.map(({ item, amount, alt }) => {
      const line = { item, amount: amount?.trim() ?? "" };

      const alternatives = Array.isArray(alt) ? alt.filter(a => a?.item)
        .map(({ item, amount }) => ({ item, amount: amount?.trim() ?? "" })) : [];

      if (alternatives.length) line.alt = alternatives;
      return line;
    }),
  };
}

export const addDish = values => write(async () => {
  const next = record(values);

  if (!next) return null;
  // The log may still refer to a deleted dish. Never reuse that id.
  const logged = Object.values(await readJson(FOOD_LOG, {})).flatMap(d => d.eaten ?? []);
  let id;
  await dishes.edit(all => {
    id = nextId("d", [...Object.keys(all), ...logged]);
    all[id] = next;
    return all;
  });
  return id;
});

export const editDish = (id, values, { before, offeredTypes } = {}) => write(async () => {
  const saved = await dishes.update(id, current => {
    if (before && JSON.stringify(current) !== before) return null;
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

export const removeDish = id => write(() => dishes.edit(all => {
  if (!all[id]) return null;
  delete all[id];
  return all;
}));

// a dish's recipe note: any note, or first a new one from the recipe template (New recipe's,
// in its folder) named as typed, else after the dish
export async function pickRecipeNote(app, dish = "") {
  const notes = app.vault.getMarkdownFiles();
  const pick = await Search.pick(app, "Choose the recipe note", query => {
    const q = query.trim(), name = q || dish.trim();
    const make = name ? [{ name, isNew: true }] : [];

    if (!q) return [...make, ...notes];
    const match = prepareFuzzySearch(q);

    return [...make, ...notes.filter(f => match(f.path))];
  }, (f, el) => el.createSpan({ text: f.isNew ? `+ new recipe note: ${f.name}` : f.path }));

  if (!pick?.isNew) return pick?.path ?? null;
  return (await createNote(KINDS.recipe, { title: pick.name }, KINDS.recipe.folder)).path;
}
