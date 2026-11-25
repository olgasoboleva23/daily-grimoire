// The cards laid out by Dashboard, including the two cards in its Finance section.
import { cycleWidget as cycle } from "#/widgets/cycle/index.js";
import { dailyNoteWidget as dailyNote } from "#/widgets/daily-note/index.js";
import { financeWidget as financeMonth } from "#/widgets/finance/index.js";
import { goalsWidget as goals } from "#/widgets/goals/index.js";
import { celestialMarket } from "#/widgets/market/index.js";
import { pomodoro } from "#/widgets/pomodoro/index.js";
import { questsWidget as quests } from "#/widgets/quests/index.js";
import { savingsWidget as savings } from "#/widgets/savings/index.js";
import { weight } from "#/widgets/weight/index.js";
import { levelToday, lifeAreas, xpToday } from "#/widgets/xp/index.js";

export const cards = {
  cycle, dailyNote, financeMonth, goals, celestialMarket, pomodoro,
  quests, savings, weight, levelToday, lifeAreas, xpToday,
};
