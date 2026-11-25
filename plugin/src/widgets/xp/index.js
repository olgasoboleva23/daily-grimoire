// XP, level and life-area cards follow completed tasks and the dashboard date.
import { taskStore } from "#/entities/task/index.js";
import { CYCLE } from "#/shared/config/index.js";
import { loadLevelToday, loadLifeAreas, loadXpToday } from "./model/store.js";
import XpToday from "#/components/pages/dashboard/widgets/xp/XpToday/index.vue";
import LevelToday from "#/components/pages/dashboard/widgets/xp/LevelToday/index.vue";
import LifeAreas from "#/components/pages/dashboard/widgets/xp/LifeAreas/index.vue";

export { XpToday, LevelToday, LifeAreas };

export const xpToday = {
  dataview: [], view: XpToday, load: loadXpToday, stores: [taskStore.version],
};

export const levelToday = {
  view: LevelToday, load: loadLevelToday, dataview: [CYCLE],
  stores: [taskStore.version], watches: [CYCLE],
};

export const lifeAreas = {
  dataview: [], view: LifeAreas, load: loadLifeAreas, stores: [taskStore.version],
};
