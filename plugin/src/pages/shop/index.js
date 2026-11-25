// Shop page view, data loader and changes that refresh it.
import { PURCHASES, SHOP } from "#/shared/config/index.js";
import { taskStore } from "#/entities/task/index.js";
import { loadShop } from "./model/store.js";
import View from "./ui/index.vue";

export default {
  view: View, load: loadShop, bodyClass: "ui-shop",
  dataview: [`${SHOP}.md`, `${PURCHASES}.md`],
  stores: [taskStore.version], watches: [`${SHOP}.md`, `${PURCHASES}.md`],
};
