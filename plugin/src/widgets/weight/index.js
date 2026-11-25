// Weight and body journals, with period days from the cycle log.
import { CYCLE, JOURNALS, WEIGHT } from "#/shared/config/index.js";
import WeightCard from "./ui/index.vue";
import { loadWeight } from "./model/store.js";

export { WeightCard };

export const weight = {
  view: WeightCard, load: loadWeight, dataview: [CYCLE], watches: [WEIGHT, `${JOURNALS}/`, CYCLE],
};
