// Dashboard goals widget: its view and the changes that reload it.
import { GOALS } from "#/shared/config/index.js";
import { taskStore } from "#/entities/task/index.js";
import GoalsWidget from "./ui/index.vue";
import { loadGoals } from "./model/store.js";

const goalsNote = `${GOALS}.md`;

export const goalsWidget = {
  view: GoalsWidget, load: loadGoals, dataview: [goalsNote],
  watches: [goalsNote], stores: [taskStore.version],
};
