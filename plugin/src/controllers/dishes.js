// Catalog data shared by Recipes, the dish viewer and the food journal.
import config from "#/shared/config/index.js";
import { foodProducts } from "#/entities/product/index.js";
import { marksOf, readFood } from "#/entities/food-log/index.js";
import { Dish, readDishes } from "#/entities/dish/index.js";
import { productsToList } from "./widgets/market.js";

export { productsToList };

export async function readFoodCatalog(options) {
  const [items, dishes, food] = await Promise.all([
    foodProducts(options), readDishes(options), readFood(),
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
