// Dashboard quests widget: its view and the changes that reload it.
import { taskStore } from "#/entities/task/index.js";
import QuestsCard from "#/components/pages/dashboard/widgets/quests/index.vue";
import { loadQuests } from "./model/store.js";

export const questsWidget = {
  dataview: [], view: QuestsCard, load: loadQuests, stores: [taskStore.version],
};
