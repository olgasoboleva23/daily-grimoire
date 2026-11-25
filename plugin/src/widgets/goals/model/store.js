// Weekly progress and recent completions for each goal on the dashboard.
import { dm, pageDay, todayYmd, weekOf, ymd } from "#/shared/lib/dates.js";
import { readGoals } from "#/entities/goal/index.js";
import { GOALS } from "#/shared/config/index.js";
import { T, taskStore } from "#/entities/task/index.js";

export async function loadGoals({ dv, app }) {
  const path = `${GOALS}.md`;

  if (!app.vault.getAbstractFileByPath(path)) return { missing: true, path };
  const selected = ymd(pageDay(dv)), today = todayYmd(), week = weekOf(selected);
  const goals = readGoals(dv);
  const tasks = taskStore.tasks.map(T);

  return {
    goals: goals.map(goal => {
      const done = tasks.filter(t => t.isDone && t.doneOn && t.goal === goal.key)
        .map(t => t.doneOn);
      const doneSet = new Set(done), last = [...done].sort().at(-1);
      // "I've done this before": total and last time, from the ✅ dates already in the tasks
      const bits = [goal.min && `min: ${goal.min}`,
        done.length && `done ${done.length}× · last ${dm(last)}`];

      return {
        name: goal.name, plan: goal.plan,
        count: `${goal.doneIn(done, week)} of ${goal.weeklyTarget}`,
        dots: week.map(day => ({
          day, status: goal.statusOn(day, doneSet, today), sel: day === selected,
        })),
        min: bits.filter(Boolean).join("  ·  "),
      };
    }),
  };
}
