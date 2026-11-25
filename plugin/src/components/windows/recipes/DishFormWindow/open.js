// Opening a dish's form (DishFormWindow): the recipes page's ＋ Dish and ✏️, a dish window's ✏️,
// the food page's + new dish and an eaten dish. An existing dish ({ id }) is read again from disk
// (so one changed meanwhile is not overwritten); a new one may bring its typed name ({ name }).
// Resolves the dish's id once saved, null closed or gone (the notice).
import { Notice } from "obsidian";
import config from "#/helpers/config.js";
import { openWindow } from "#/components/uikit/Window/open.ts";
import { readDish, readProducts } from "#/controllers/dishes.js";
import DishFormWindow from "./index.vue";

export async function openDishForm(dish = null) {
  const id = dish?.id ?? null;
  const current = id ? await readDish(id) : dish;

  if (id && !current) {
    new Notice("✦ that dish is gone");
    return null;
  }

  const products = new Map((await readProducts()).map(p => [p.id, p.name]));
  const types = config.dishTypes.map(t => ({ label: t.name, value: t.key }));

  return openWindow(DishFormWindow, {
    id, dish: current ?? {}, before: id ? JSON.stringify(current) : null, products, types,
  });
}
