// Food marks and the journal’s training task.
import { food, readFood } from "./repository/food.js";

export const DEFAULT_MARKS = [
  { tag: "m1", icon: "🍫", name: "какао" },
  { tag: "m2", icon: "🥛", name: "молоко" },
  { tag: "m3", icon: "🥛↓", name: "безлактозное молоко" },
];

export const marksOf = data => data.marks ?? DEFAULT_MARKS;

export const withMarks = (data, marks) => ({ ...data, marks });

export const withTask = (data, id) => ({ ...data, task: id });

export const readMarks = async () => marksOf(await readFood());

export const saveMarks = marks => food.edit(data => {
  const tags = [...marksOf(data), ...marks].map(m => Number(m.tag?.slice(1)) || 0);
  let n = Math.max(0, ...tags);
  const next = marks.map(m => ({
    tag: m.tag ?? `m${++n}`, icon: m.icon.trim(), name: m.name.trim(),
  }));

  return withMarks(data, next);
});

export const setTrainingTask = id => food.edit(d => withTask(d, id));
