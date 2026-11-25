// The pages' widgets by name (each a .vue drawn by UiWidget). A widget's writes aren't here: its
// .vue imports them from its controller.
import { loadLevelToday, loadLifeAreas, loadXpToday } from "#/controllers/widgets/xp.js";
import { loadQuests } from "#/controllers/widgets/quests.js";
import { loadShop } from "#/controllers/widgets/shop.js";
import { loadCelestialMarket, loadSupplies } from "#/controllers/widgets/market.js";
import { loadGoals } from "#/controllers/widgets/goals.js";
import { loadSavings } from "#/controllers/widgets/savings.js";
import { loadCycle } from "#/controllers/widgets/cycle.js";
import { loadFinance, loadFinanceLine } from "#/controllers/widgets/finance.js";
import { loadWeight } from "#/controllers/widgets/weight.js";
import {
  COURSES, CYCLE, DISHES, FOOD_DATA, FOOD_LOG, GOALS, JOURNALS, LEDGER, MARKET_NOTE, MARKET_RECORDS,
  CONFIG, PURCHASES, RULES, SAVINGS, SHOP, TASKS, WEIGHT,
} from "#/helpers/paths.js";
import { loadDailyNote } from "#/controllers/widgets/dailyNote.js";
import { loadPomodoro } from "#/controllers/widgets/pomodoro.js";
import { loadMeds } from "#/controllers/meds.js";
import { loadRecipes } from "#/controllers/dishes.js";
import { loadFood } from "#/controllers/food.js";
// the widgets' markup: components/pages/dashboard/widgets/
import XpToday from "#/components/pages/dashboard/widgets/xp/XpToday/index.vue";
import LevelToday from "#/components/pages/dashboard/widgets/xp/LevelToday/index.vue";
import LifeAreas from "#/components/pages/dashboard/widgets/xp/LifeAreas/index.vue";
import QuestsCard from "#/components/pages/dashboard/widgets/quests/index.vue";
import ShopWidget from "#/components/pages/shop/index.vue";
import SuppliesWidget from "#/components/pages/supplies/index.vue";
import CelestialMarket from "#/components/pages/dashboard/widgets/market/index.vue";
import CelestialMarketAdd from "#/components/pages/dashboard/widgets/market/CelestialMarketAdd.vue";
import GoalsWidget from "#/components/pages/dashboard/widgets/goals/index.vue";
import SavingsJars from "#/components/pages/dashboard/widgets/savings/index.vue";
import CycleWidget from "#/components/pages/dashboard/widgets/cycle/index.vue";
import FinanceMonths from "#/components/pages/finance/index.vue";
import FinanceLine from "#/components/pages/dashboard/widgets/finance/index.vue";
import WeightCard from "#/components/pages/dashboard/widgets/weight/index.vue";
import DailyNoteOpen from "#/components/pages/dashboard/widgets/DailyNoteOpen.vue";
import PomodoroTimer from "#/components/pages/dashboard/widgets/pomodoro/index.vue";
// the Vue pages: components/pages/<page>/
import MedsPage from "#/components/pages/meds/index.vue";
import RecipesPage from "#/components/pages/recipes/index.vue";
import FoodPage from "#/components/pages/food/index.vue";

// the widgets: name → { view: the .vue, load(ctx): its data, cardButton: a .vue next to the
// card's title, bodyClass: a class on the card's body, watches: the files it reads (a folder:
// ending in /): only their changes load it again (any other note's doesn't), follows: false to
// load once, dataview: the paths read through Dataview (including [] for its date API) }
const TASK_FILES = `${TASKS}/`, LEDGER_FILES = `${LEDGER}/`;

export const blocks = {
  xpToday: { dataview: [], view: XpToday, load: loadXpToday, watches: [TASK_FILES] },
  quests: { dataview: [], view: QuestsCard, load: loadQuests, watches: [TASK_FILES] },
  levelToday: {
    view: LevelToday, load: loadLevelToday, dataview: [CYCLE], watches: [TASK_FILES, CYCLE],
  },
  lifeAreas: { dataview: [], view: LifeAreas, load: loadLifeAreas, watches: [TASK_FILES] },
  shop: {
    view: ShopWidget, load: loadShop, bodyClass: "ui-shop",
    dataview: [`${SHOP}.md`, `${PURCHASES}.md`],
    watches: [TASK_FILES, `${SHOP}.md`, `${PURCHASES}.md`],
  },
  supplies: { view: SuppliesWidget, load: loadSupplies, watches: [MARKET_NOTE, MARKET_RECORDS] },
  goals: {
    view: GoalsWidget, load: loadGoals, dataview: [`${GOALS}.md`],
    watches: [`${GOALS}.md`, TASK_FILES],
  },
  savings: { view: SavingsJars, load: loadSavings, watches: [`${SAVINGS}/`] },
  cycle: { dataview: [CYCLE], view: CycleWidget, load: loadCycle, watches: [CYCLE] },
  finance: { view: FinanceMonths, load: loadFinance, watches: [LEDGER_FILES, RULES] },
  financeMonth: { view: FinanceLine, load: loadFinanceLine, watches: [LEDGER_FILES, RULES] },
  // a reload keeps the typed picks
  weight: {
    view: WeightCard, load: loadWeight, dataview: [CYCLE], watches: [WEIGHT, `${JOURNALS}/`, CYCLE],
  },
  // the tab's date only (useTabDate)
  dailyNote: { dataview: [], view: DailyNoteOpen, load: loadDailyNote, watches: [] },
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
    watches: [FOOD_DATA, FOOD_LOG, DISHES, MARKET_RECORDS, COURSES, `${JOURNALS}/`, TASK_FILES],
  },
};
