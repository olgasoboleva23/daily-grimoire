// Dashboard finance widget: its view and the changes that reload it.
import { LEDGER, RULES } from "#/shared/config/index.js";
import FinanceLine from "#/components/pages/dashboard/widgets/finance/index.vue";
import { loadFinanceLine } from "./model/store.js";

export const financeWidget = {
  view: FinanceLine, load: loadFinanceLine, watches: [`${LEDGER}/`, RULES],
};
