// TODO: remove this registry when the app tab and dashboard import their descriptions directly.
import recipes from "#/pages/recipes/index.js";
import food from "#/pages/food/index.js";
import shop from "#/pages/shop/index.js";
import supplies from "#/pages/supplies/index.js";
import meds from "#/pages/meds/index.js";
import finance from "#/pages/finance/index.js";
import { xpToday, levelToday, lifeAreas } from "#/widgets/xp/index.js";
import { weight } from "#/widgets/weight/index.js";
import { celestialMarket } from "#/widgets/market/index.js";
import { pomodoro } from "#/widgets/pomodoro/index.js";
import { questsWidget } from "#/widgets/quests/index.js";
import { goalsWidget } from "#/widgets/goals/index.js";
import { savingsWidget } from "#/widgets/savings/index.js";
import { cycleWidget } from "#/widgets/cycle/index.js";
import { financeWidget } from "#/widgets/finance/index.js";
import { dailyNoteWidget } from "#/widgets/daily-note/index.js";

export const blocks = {
  xpToday,
  quests: questsWidget,
  levelToday,
  lifeAreas,
  shop,
  supplies,
  goals: goalsWidget,
  savings: savingsWidget,
  cycle: cycleWidget,
  finance,
  financeMonth: financeWidget,
  // a reload keeps the typed picks
  weight,
  // the tab's date only (useTabDate)
  dailyNote: dailyNoteWidget,
  pomodoro,
  celestialMarket,
  meds,
  recipes,
  food,
};
