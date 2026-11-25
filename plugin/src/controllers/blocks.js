// The pages' widgets by name (each a .vue drawn by UiWidget). A widget's writes aren't here: its
// .vue imports them from its controller.
import { xpToday, levelToday, lifeAreas } from "#/widgets/xp/index.js";
import { weight } from "#/widgets/weight/index.js";
import { celestialMarket } from "#/widgets/market/index.js";
import { pomodoro } from "#/widgets/pomodoro/index.js";
import { taskStore } from "#/entities/task/index.js";
import { loadShop } from "#/controllers/widgets/shop.js";
import { loadSupplies } from "#/controllers/widgets/market.js";
import { loadFinance } from "#/controllers/widgets/finance.js";
import {
  COURSES, DISHES, FOOD_DATA, FOOD_LOG, JOURNALS, LEDGER, MARKET_NOTE, MARKET_RECORDS,
  CONFIG, PURCHASES, RULES, SHOP,
} from "#/shared/config/index.js";
import { loadMeds } from "#/controllers/meds.js";
import { loadRecipes } from "#/widgets/dish-window/index.js";
import { loadFood } from "#/controllers/food.js";
// the widgets' markup: components/pages/dashboard/widgets/
import { questsWidget } from "#/widgets/quests/index.js";
import { goalsWidget } from "#/widgets/goals/index.js";
import { savingsWidget } from "#/widgets/savings/index.js";
import { cycleWidget } from "#/widgets/cycle/index.js";
import { financeWidget } from "#/widgets/finance/index.js";
import { dailyNoteWidget } from "#/widgets/daily-note/index.js";
import ShopWidget from "#/components/pages/shop/index.vue";
import SuppliesWidget from "#/components/pages/supplies/index.vue";
import FinanceMonths from "#/components/pages/finance/index.vue";
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
  xpToday,
  quests: questsWidget,
  levelToday,
  lifeAreas,
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
  weight,
  // the tab's date only (useTabDate)
  dailyNote: dailyNoteWidget,
  pomodoro,
  celestialMarket,
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
