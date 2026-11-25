// Supplies page view, data loader and changes that refresh it.
import { MARKET_NOTE, MARKET_RECORDS } from "#/shared/config/index.js";
import { loadSupplies } from "./model/store.js";
import View from "./ui/index.vue";

export default {
  view: View, load: loadSupplies, watches: [MARKET_NOTE, MARKET_RECORDS],
};
