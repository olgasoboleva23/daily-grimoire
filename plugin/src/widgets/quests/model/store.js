// The selected day’s open and completed tasks, in the order shown on the Quests card.
import config from "#/shared/config/index.js";
import { pageDay, ymd } from "#/shared/lib/dates.js";
import { T, taskKey, daytimeMark, daytimeRank, taskStore } from "#/entities/task/index.js";

export async function loadQuests({ dv }) {
  const day = ymd(pageDay(dv)), order = config.areas.map(a => a.key);
  const rank = task => order.indexOf(task.area) >>> 0;   // unknown areas last
  const rows = (pick, done) => taskStore.tasks.map(t => [t, T(t)]).filter(([, k]) => pick(k))
    .sort(([, a], [, b]) => daytimeRank(a.daytime) - daytimeRank(b.daytime) || rank(a) - rank(b)
      || a.text.localeCompare(b.text))
    .map(([t, k]) => ({
      key: taskKey(t), t, done,
      label: daytimeMark(k.daytime) + `${config.areaIcons[k.area] ?? ""} ${k.text}`.trim(),
    }));

  return {
    day,
    open: rows(k => k.isOpen && k.date === day, false),
    done: rows(k => k.isDone && k.doneOn === day, true),
  };
}
