// Food page view, data loader and changes that refresh it.
import {
  COURSES, DISHES, FOOD_DATA, FOOD_LOG, JOURNALS, MARKET_RECORDS,
} from "#/shared/config/index.js";
import { taskStore } from "#/entities/task/index.js";
import { loadFood } from "./model/store.js";
import View from "#/components/pages/food/index.vue";

export default {
  view: View, load: loadFood, stores: [taskStore.version],
  watches: [FOOD_DATA, FOOD_LOG, DISHES, MARKET_RECORDS, COURSES, `${JOURNALS}/`],
};
