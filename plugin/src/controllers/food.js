// Loads food, journal and medication data for the Food page.
import { readLog } from "#/entities/food-log/index.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { readFoodCatalog } from "./dishes.js";
import { readJournals } from "#/entities/weight/index.js";
import { forFood, readCourses } from "#/entities/course/index.js";
import { T, taskStore } from "#/entities/task/index.js";

// the medication courses (courses.json): when they run, their medicines, and by day the codes
// with a ✅
const courses = async () =>
  Object.entries(await readCourses()).map(([id, rec]) => forFood(id, rec));

export async function loadFood() {
  const [data, days, journals, taking] = await Promise.all([
    readFoodCatalog({ includeDeleted: true }), readLog(), readJournals(), courses(),
  ]);

  const id = data.task ?? null, rec = id && taskStore.records.get(id);
  const done = id ? taskStore.tasks.map(T).filter(t => t.id === id && t.isDone) : [];
  const task = id && { id, name: rec?.name ?? id, days: new Set(done.map(t => t.doneOn)) };

  return {
    ...data, task, today: todayYmd(), log: days, journals,
    courses: taking,
  };
}
