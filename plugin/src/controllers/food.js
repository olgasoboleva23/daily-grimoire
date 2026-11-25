// Loads food, journal and medication data for the Food page.
// Writes eaten items, day notes, mark definitions and the training task.
import { readJson } from "#/helpers/files.js";
import { collection } from "#/helpers/collection.js";
import { todayYmd } from "#/helpers/dates.js";
import {
  marksOf, withEaten, withMarks, withNote, withoutEaten, withTask,
} from "#/models/food.js";
import { readFoodCatalog } from "./dishes.js";
import { readJournals } from "#/controllers/journals.js";
import { forFood } from "#/models/course.js";
import { T } from "#/models/calendarData.js";
import { taskStore } from "#/store/tasks.js";
import { COURSES, FOOD_DATA, FOOD_LOG } from "#/helpers/paths.js";

// food.json (the marks and the training task) and log.json (the days): each write one
// edit of its file
const food = collection(FOOD_DATA), log = collection(FOOD_LOG);

// the medication courses (courses.json): when they run, their medicines, and by day the codes
// with a ✅
const courses = async () =>
  Object.entries(await readJson(COURSES, {})).map(([id, rec]) => forFood(id, rec));

export async function loadFood() {
  const [data, days, journals, taking] =
    await Promise.all([readFoodCatalog(), readJson(FOOD_LOG, {}), readJournals(), courses()]);

  const id = data.task ?? null, rec = id && taskStore.records.get(id);
  const done = id ? taskStore.tasks.map(T).filter(t => t.id === id && t.isDone) : [];
  const task = id && { id, name: rec?.name ?? id, days: new Set(done.map(t => t.doneOn)) };

  return {
    ...data, task, today: todayYmd(), log: days, journals,
    courses: taking,
  };
}

export const logEaten = (date, id) => log.edit(l => withEaten(l, date, id));

export const removeEaten = (date, n) => log.edit(l => withoutEaten(l, date, n));

export const setFoodNote = (date, text) => log.edit(l => withNote(l, date, text));

export const saveMarks = marks => food.edit(data => {
  const tags = [...marksOf(data), ...marks].map(m => Number(m.tag?.slice(1)) || 0);
  let n = Math.max(0, ...tags);
  const next = marks.map(m => ({
    tag: m.tag ?? `m${++n}`, icon: m.icon.trim(), name: m.name.trim(),
  }));

  return withMarks(data, next);
});

export const setTrainingTask = id => food.edit(d => withTask(d, id));
