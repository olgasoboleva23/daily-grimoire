// Catalog data shared by Recipes, the dish viewer and the food journal.
import config, { MARKET_RECORDS } from "#/shared/config/index.js";
import { readJson } from "#/shared/vault/index.js";
import { marksOf, readFood } from "#/entities/food-log/index.js";
import { Dish, readDishes } from "#/entities/dish/index.js";
import { productsToList } from "./widgets/market.js";

export { productsToList };

const rows = records => Object.entries(records).map(([id, r]) => ({ ...r, id }));

export async function readProducts() {
  return rows(await readJson(MARKET_RECORDS, {})).filter(p => p.type === "food")
    .map(({ id, name, marks }) => ({ id, name, marks: marks ?? [] }));
}

export async function readFoodCatalog(options) {
  const [items, dishes, food] = await Promise.all([
    readProducts(), readDishes(options), readFood(),
  ]);

  return {
    items: items.map(p => ({ ...p, type: "food" })),
    dishes, marks: marksOf(food), task: food.task,
  };
}

export async function loadRecipes() {
  const data = await readFoodCatalog();

  const types = new Set(config.dishTypes.map(t => t.key));
  const dishes = Dish.list(data).map(dish => ({
    ...dish, type: types.has(dish.type) ? dish.type : "",
  }));

  return { items: data.items, marks: data.marks, dishes };
}
