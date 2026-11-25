// Something eaten, the food page's flows. ＋ on a day: a fuzzy search of the products and dishes
// (recently eaten first), or a new product / dish typed (its window first), then logged on that
// day. An eaten one's name: its own window (a product: Edit item; a dish: its form).
import { prepareFuzzySearch } from "obsidian";
import { app } from "#/helpers/app.js";
import { foodChoices } from "#/models/food.js";
import { Search } from "#/components/uikit/Search/index.ts";
import { loadFood, logEaten } from "#/controllers/food.js";
import { readDish } from "#/controllers/dishes.js";
import {
  openEditItem, openNewProduct,
} from "#/components/windows/market/MarketItemWindow/open.js";
import { openDishForm } from "#/components/windows/recipes/DishFormWindow/open.js";

export async function addEaten(date) {
  const choices = foodChoices(await loadFood());
  const pick = await Search.pick(app, "What was eaten…", query => {
    const q = query.trim();

    if (!q) return choices;
    const match = prepareFuzzySearch(q);

    return [...choices.filter(c => match([c.name, ...c.ingredients].join(" "))),
      { name: q, create: "product" }, { name: q, create: "dish" }];
  }, (c, el) => {
    const ingredients = c.kind === "dish" ? ` (${c.ingredients.join(", ")})` : "";
    el.createSpan({ text: c.create ? `+ new ${c.create}: ${c.name}`
      : `${c.kind === "dish" ? "🍲 " : ""}${c.name}${ingredients} ${c.icons}`.trim() });
  });

  if (!pick) return;
  let id = pick.id;

  if (pick.create === "product") id = await openNewProduct(pick.name);
  if (pick.create === "dish") id = await openDishForm({ name: pick.name });
  if (id) await logEaten(date, id);
}

export async function editEaten(id) {
  if (id.startsWith("m")) return openEditItem(id);
  const dish = await readDish(id);

  if (dish) return openDishForm({ ...dish, id });
}
