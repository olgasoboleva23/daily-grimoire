// Dashboard quests widget: its view and the changes that reload it.
import { taskStore } from "#/entities/task/index.js";
import QuestsCard from "./ui/index.vue";
import { loadQuests } from "./model/store.js";

export const questsWidget = {
  dataview: [], view: QuestsCard, load: loadQuests, stores: [taskStore.version],
};
