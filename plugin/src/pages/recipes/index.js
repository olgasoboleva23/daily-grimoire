// Recipes page view, data loader and changes that refresh it.
import { CONFIG, DISHES, FOOD_DATA, MARKET_RECORDS } from "#/shared/config/index.js";
import { loadRecipes } from "#/widgets/dish-window/index.js";
import View from "./ui/index.vue";

export default {
  view: View, load: loadRecipes, watches: [DISHES, MARKET_RECORDS, FOOD_DATA, CONFIG],
  watchesNote: (data, path) => data?.dishes.some(dish => dish.link === path),
};

export { readState } from "./model/store.js";
