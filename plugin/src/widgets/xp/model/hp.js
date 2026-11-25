// HP lost to missed tasks and recovered by today’s completed tasks.
import config from "#/shared/config/index.js";

const HP_MAX = 50;
const stars = t => t.difficulty === "none" ? 0
  : config.difficulties.findIndex(d => d.key === t.difficulty) + 1;
const sum = (list, f) => list.reduce((a, t) => a + f(t), 0);

export function vitals({ missed, doneToday }) {
  const damage = sum(missed, t => 2 * stars(t)), heal = sum(doneToday, stars);

  return { hp: Math.max(0, Math.min(HP_MAX, HP_MAX - damage + heal)), hpMax: HP_MAX, damage, heal };
}
