// Dashboard savings widget: its view and the changes that reload it.
import { SAVINGS } from "#/shared/config/index.js";
import SavingsJars from "#/components/pages/dashboard/widgets/savings/index.vue";
import { loadSavings } from "./model/store.js";

export const savingsWidget = {
  view: SavingsJars, load: loadSavings, watches: [`${SAVINGS}/`],
};

export { SavingsJar, paydays } from "./model/savingsJar.js";

export { deposit, paydaySum } from "./model/repository/savings.js";
