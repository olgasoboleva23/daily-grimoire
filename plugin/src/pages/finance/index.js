// Finance page view, data loader and changes that refresh it.
import { LEDGER, RULES } from "#/shared/config/index.js";
import { loadFinance } from "./model/store.js";
import View from "#/components/pages/finance/index.vue";

export default {
  view: View, load: loadFinance, watches: [`${LEDGER}/`, RULES],
};
