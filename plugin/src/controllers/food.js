// The food page's controller (components/pages/food): its data (the food products and dishes
// with their marks, the log, the free journals, the medication courses) and its writes: something
// eaten on a day (a fuzzy search of the products and dishes, recently eaten first, or a new
// product / dish), an eaten product edited in the market's catalog, an eaten one taken off, a
// day's note, the marks edited, the training task.
import { prepareFuzzySearch } from "obsidian";
import { app } from "#/helpers/app.js";
import { readJson } from "#/helpers/files.js";
import { collection } from "#/helpers/collection.js";
import { todayYmd } from "#/helpers/dates.js";
import {
  foodChoices, marksOf, withEaten, withMarks, withNote, withoutEaten, withTask,
} from "#/models/food.js";
import { addProduct, askDish, readFoodCatalog } from "./dishes.js";
import { editMarketItem } from "./widgets/market.js";
import { readJournals } from "#/controllers/journals.js";
import { forFood } from "#/models/course.js";
import { T } from "#/models/calendarData.js";
import { Notice } from "obsidian";
import { pickTask } from "#/components/uikit/TaskSearch/index.js";
import { taskStore } from "#/store/tasks.js";
import { Search } from "#/components/uikit/Search/index.ts";
import { Form } from "#/components/uikit/Form/index.ts";
import { COURSES, DISHES, FOOD_DATA, FOOD_LOG } from "#/helpers/paths.js";

// food.json (the marks and the training task) and log.json (the days): each write one
// edit of its file
const food = collection(FOOD_DATA), log = collection(FOOD_LOG);
const readFood = () => readJson(FOOD_DATA, {});

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

export async function addEaten(date) {
  const [data, days] = await Promise.all([readFoodCatalog(), readJson(FOOD_LOG, {})]);
  const choices = foodChoices({ ...data, log: days, today: todayYmd() });
  const pick = await Search.pick(app, "What was eaten…", query => {
    const q = query.trim();

    if (!q) return choices;
    const match = prepareFuzzySearch(q);

    return [...choices.filter(c => match([c.name, ...c.ingredients].join(" "))),
      { name: q, create: "product" }, { name: q, create: "dish" }];
  }, (c, el) => {
    const ingredients = c.kind === "dish" ? ` (${c.ingredients.join(", ")})` : "";
    el.createSpan({ text: c.create ? `+ new ${c.create}: ${c.name}`
      : `${c.kind === "dish" ? "🍲 " : ""}${c.name}${ingredients} ${c.icons}`.trim() });
  });

  if (!pick) return;
  let id = pick.id;

  if (pick.create === "product") id = await addProduct(pick.name);
  if (pick.create === "dish") id = await askDish(app, { name: pick.name });
  if (id) await log.edit(l => withEaten(l, date, id));
}

export async function editEaten(id) {
  if (id.startsWith("m")) return editMarketItem(id);
  const dish = (await readJson(DISHES, {}))[id];

  if (dish) return askDish(app, { ...dish, id });
}

export const removeEaten = (date, n) => log.edit(l => withoutEaten(l, date, n));

export const setFoodNote = (date, text) => log.edit(l => withNote(l, date, text));

// ⚙ the marks: an icon and a name each (+ adds one); a mark keeps its tag, a new one gets the next
export async function editMarks() {
  const marks = marksOf(await readFood());
  const v = await Form.ask(app, "✦ Marks", [{
    name: "Marks", key: "marks", required: ["icon", "name"],
    list: [{ name: "Icon", key: "icon", text: "🍫" }, { name: "Name", key: "name", text: "какао" }],
  }], { values: { marks: marks.map(m => ({ ...m })) }, required: ["marks"], submit: "Save" });

  if (!v) return;
  let n = Math.max(0, ...marks.map(m => Number(m.tag.slice(1)) || 0));
  const next = v.marks
    .map(m => ({ tag: m.tag ?? `m${++n}`, icon: m.icon.trim(), name: m.name.trim() }));

  await food.edit(d => withMarks(d, next));
}

// 🏋 the training task: a past one from the search (its id goes to food.json), not a new name
export async function pickTrainingTask() {
  const pick = await pickTask();

  if (!pick) return;
  if (pick.isNew) return void new Notice("✦ pick a task you already have");
  await food.edit(d => withTask(d, pick.id));
}
