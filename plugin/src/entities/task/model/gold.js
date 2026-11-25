// Gold earned from completed task copies, using the configured difficulty rewards.
import config from "#/shared/config/index.js";
import { T } from "./task.js";

export function earned(tasks) {
  let gold = 0;

  for (const t of tasks.map(T)) {
    if (t.isDone) gold += config.difficulties.find(d => d.key === t.difficulty)?.gold ?? 0;
  }

  return gold;
}
