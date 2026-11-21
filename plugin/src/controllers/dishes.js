// The recipe book's controller (components/pages/recipes): dishes.json, a dish by id ({ name, type,
// ingredients: [{ item: a market product's id, amount, alt? }], link: its recipe note or "" for an
// ordered one). Names and marks come from the market, so only ids and amounts are kept here. The
// writes: a dish added / edited (its form: products picked or made, a note picked or made from
// the recipe template), removed, the selected food products added to the shopping list.
import { shallowReactive } from "vue";
import { prepareFuzzySearch } from "obsidian";
import { collection } from "#/helpers/collection.js";
import { nextId } from "#/helpers/ids.js";
import { readJson, serial } from "#/helpers/files.js";
import { DISHES, FOOD_DATA, FOOD_LOG, MARKET_RECORDS } from "#/helpers/paths.js";
import config from "#/helpers/config.js";
import { dishList, marksOf } from "#/models/food.js";
import { validNoteLink } from "./journal.js";
import { createNote } from "./notes.js";
import { KINDS } from "#/models/kinds.js";
import { addProduct, addToMarket, editMarketItem } from "./widgets/market.js";
import { Form } from "#/components/uikit/Form/index.ts";
import { Search } from "#/components/uikit/Search/index.ts";

export { addProduct };
// The open Recipes page computes its tabs from this array; applyConfig updates it in place.
config.dishTypes = shallowReactive(config.dishTypes);

const dishes = collection(DISHES), write = serial();
const rows = records => Object.entries(records).map(([id, r]) => ({ ...r, id }));

async function products() {
  return rows(await readJson(MARKET_RECORDS, {})).filter(p => p.type === "food")
    .map(p => ({ ...p, marks: p.marks ?? [] }));
}

export async function readFoodCatalog() {
  const [items, raw, food] = await Promise.all([
    products(), readJson(DISHES, {}), readJson(FOOD_DATA, {}),
  ]);

  return { items, dishes: rows(raw), marks: marksOf(food), task: food.task };
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

      if (typeof alt === "string" && alt.trim()) line.alt = alt.trim();
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

export const editDish = (id, values, offeredTypes) => write(() => dishes.update(id, current => {
  // An unlisted type looks empty in Recipes. Saving other fields keeps its stored key.
  if (!values.type && current.type && offeredTypes && !offeredTypes.includes(current.type))
    return record({ ...values, type: current.type });
  return record(values);
}));

export const removeDish = id => write(() => dishes.edit(all => {
  if (!all[id]) return null;
  delete all[id];
  return all;
}));

export async function pickProduct(app, alternative = false) {
  const items = await products();
  const clear = alternative ? [{ name: "— no alternative", id: "" }] : [];
  const pick = await Search.pick(app, "Choose a product", query => {
    const q = query.trim();

    if (!q) return [...clear, ...items];
    const match = prepareFuzzySearch(q);

    return [...clear, ...items.filter(i => match(i.name)), { name: q, isNew: true }];
  }, (i, el) => el.createSpan({ text: i.isNew ? `+ new product: ${i.name}` : i.name }));

  return pick?.isNew ? addProduct(pick.name) : pick?.id ?? null;
}

const noteName = path => path.split("/").pop().replace(/\.md$/i, "");

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

export async function askDish(app, dish = null, ask = Form.ask.bind(Form)) {
  const items = new Map((await products()).map(p => [p.id, p.name]));

  const named = async id => {
    items.set(id, (await readJson(MARKET_RECORDS, {}))[id]?.name ?? id);
    return id;
  };

  const pick = async alternative => {
    const id = await pickProduct(app, alternative);

    return id && !items.has(id) ? named(id) : id;
  };

  const show = id => items.get(id) ?? id;

  // a line's product: chosen, its own edit window (a name, marks); none yet, the picker
  const product = async line => {
    if (line.item) {
      await editMarketItem(line.item);
      return named(line.item);
    }

    return pick(false);
  };

  const types = config.dishTypes.map(t => ({ label: t.name, value: t.key }));
  const values = await ask(app, dish?.id ? "Edit dish" : "New dish", [
    { name: "Name", key: "name", text: "Dish name" },
    { name: "Ingredients", key: "ingredients", required: ["item"], list: [
      { name: "Product", key: "item", pick: product, show },
      { name: "Or", key: "alt", pick: () => pick(true), show },
      { name: "Amount", key: "amount", text: "500 г" },
    ] },
    { name: "Type", key: "type", options: [{ label: "—", value: "" }, ...types] },
    { name: "Note", key: "link", pick: v => pickRecipeNote(app, v.name), show: noteName },
  ], { values: { name: dish?.name ?? "", ingredients: dish?.ingredients?.map(i => ({ ...i })) ?? [],
    type: dish?.type ?? "", link: dish?.link ?? "" },
  required: ["name", "ingredients"], submit: "Save" });

  if (!values) return null;
  if (!dish?.id) return addDish(values);
  return await editDish(dish.id, values, types.map(t => t.value)) ? dish.id : null;
}

// Add the selected food products once and count only new shopping-list entries.
export async function productsToList(ids) {
  if (!ids.length) return 0;
  const items = new Map((await products()).map(p => [p.id, p]));
  let added = 0;

  for (const item of new Set(ids)) {
    const product = items.get(item);

    if (product && await addToMarket(product.name, product.type, product.id)) added++;
  }

  return added;
}
