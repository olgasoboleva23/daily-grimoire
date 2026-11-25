// Goals stored in the Dataview list in Goals.md.
import { GOALS } from "#/shared/config/index.js";
import { Goal } from "../goal.js";

export const readGoals = dv => dv.pages(`"${GOALS}"`).file.lists
  .map(i => Goal.parse(i.text)).where(Boolean).array();
