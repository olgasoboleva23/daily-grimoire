// The pages' widgets by name (each a .vue drawn by UiWidget). A widget's writes aren't here: its
// .vue imports them from its controller.
import { taskStore } from "#/entities/task/index.js";
import { loadLevelToday, loadLifeAreas, loadXpToday } from "#/controllers/widgets/xp.js";
import { loadShop } from "#/controllers/widgets/shop.js";
import { loadCelestialMarket, loadSupplies } from "#/controllers/widgets/market.js";
import { loadFinance } from "#/controllers/widgets/finance.js";
import { loadWeight } from "#/controllers/widgets/weight.js";
import {
  COURSES, CYCLE, DISHES, FOOD_DATA, FOOD_LOG, JOURNALS, LEDGER, MARKET_NOTE, MARKET_RECORDS,
  CONFIG, PURCHASES, RULES, SHOP, WEIGHT,
} from "#/shared/config/index.js";
import { loadPomodoro } from "#/controllers/widgets/pomodoro.js";
import { loadMeds } from "#/controllers/meds.js";
import { loadRecipes } from "#/controllers/dishes.js";
import { loadFood } from "#/controllers/food.js";
// the widgets' markup: components/pages/dashboard/widgets/
import XpToday from "#/components/pages/dashboard/widgets/xp/XpToday/index.vue";
import LevelToday from "#/components/pages/dashboard/widgets/xp/LevelToday/index.vue";
import LifeAreas from "#/components/pages/dashboard/widgets/xp/LifeAreas/index.vue";
import { questsWidget } from "#/widgets/quests/index.js";
import ShopWidget from "#/components/pages/shop/index.vue";
import SuppliesWidget from "#/components/pages/supplies/index.vue";
import CelestialMarket from "#/components/pages/dashboard/widgets/market/index.vue";
import CelestialMarketAdd from "#/components/pages/dashboard/widgets/market/CelestialMarketAdd.vue";
import { goalsWidget } from "#/widgets/goals/index.js";
import { savingsWidget } from "#/widgets/savings/index.js";
import { cycleWidget } from "#/widgets/cycle/index.js";
import FinanceMonths from "#/components/pages/finance/index.vue";
import { financeWidget } from "#/widgets/finance/index.js";
import WeightCard from "#/components/pages/dashboard/widgets/weight/index.vue";
import { dailyNoteWidget } from "#/widgets/daily-note/index.js";
import PomodoroTimer from "#/components/pages/dashboard/widgets/pomodoro/index.vue";
// the Vue pages: components/pages/<page>/
import MedsPage from "#/components/pages/meds/index.vue";
import RecipesPage from "#/components/pages/recipes/index.vue";
import FoodPage from "#/components/pages/food/index.vue";

// the widgets: name → { view: the .vue, load(ctx): its data, cardButton: a .vue next to the
// card's title, bodyClass: a class on the card's body, watches: the files it reads (a folder:
// ending in /): only their changes load it again (any other note's doesn't), follows: false to
// load once, dataview: the paths read through Dataview (including [] for its date API) }
const LEDGER_FILES = `${LEDGER}/`;

export const blocks = {
  xpToday: { dataview: [], view: XpToday, load: loadXpToday, stores: [taskStore.version] },
  quests: questsWidget,
  levelToday: {
    view: LevelToday, load: loadLevelToday, dataview: [CYCLE],
    stores: [taskStore.version], watches: [CYCLE],
  },
  lifeAreas: { dataview: [], view: LifeAreas, load: loadLifeAreas, stores: [taskStore.version] },
  shop: {
    view: ShopWidget, load: loadShop, bodyClass: "ui-shop",
    dataview: [`${SHOP}.md`, `${PURCHASES}.md`],
    stores: [taskStore.version], watches: [`${SHOP}.md`, `${PURCHASES}.md`],
  },
  supplies: { view: SuppliesWidget, load: loadSupplies, watches: [MARKET_NOTE, MARKET_RECORDS] },
  goals: goalsWidget,
  savings: savingsWidget,
  cycle: cycleWidget,
  finance: { view: FinanceMonths, load: loadFinance, watches: [LEDGER_FILES, RULES] },
  financeMonth: financeWidget,
  // a reload keeps the typed picks
  weight: {
    view: WeightCard, load: loadWeight, dataview: [CYCLE], watches: [WEIGHT, `${JOURNALS}/`, CYCLE],
  },
  // the tab's date only (useTabDate)
  dailyNote: dailyNoteWidget,
  pomodoro: { view: PomodoroTimer, load: loadPomodoro, follows: false },
  celestialMarket: {
    view: CelestialMarket,
    load: loadCelestialMarket,
    cardButton: CelestialMarketAdd,
    watches: [MARKET_NOTE, MARKET_RECORDS],
  },
  // the medication courses from JSON
  meds: { view: MedsPage, load: loadMeds, watches: [COURSES] },
  recipes: {
    view: RecipesPage, load: loadRecipes, watches: [DISHES, MARKET_RECORDS, FOOD_DATA, CONFIG],
    watchesNote: (data, path) => data?.dishes.some(dish => dish.link === path),
  },
  // the food journal from JSON
  food: {
    view: FoodPage, load: loadFood,
    watches: [FOOD_DATA, FOOD_LOG, DISHES, MARKET_RECORDS, COURSES, `${JOURNALS}/`],
    stores: [taskStore.version],
  },
};
