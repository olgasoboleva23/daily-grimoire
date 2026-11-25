// Dashboard cycle widget: its view and the changes that reload it.
import { CYCLE } from "#/shared/config/index.js";
import CycleWidget from "#/components/pages/dashboard/widgets/cycle/index.vue";
import { loadCycle } from "./model/store.js";

export const cycleWidget = {
  dataview: [CYCLE], view: CycleWidget, load: loadCycle, watches: [CYCLE],
};
