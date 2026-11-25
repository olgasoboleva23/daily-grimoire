// Foods eaten on a day and its optional note.
import { log } from "./repository/log.js";

export const eaten = (log, date) => log[date]?.eaten ?? [];

export const dayNote = (log, date) => log[date]?.note ?? "";

// the log with the day set; an empty one dropped
function withDay(log, date, day) {
  if (day.eaten.length || day.note) return { ...log, [date]: day };
  const rest = { ...log };

  delete rest[date];
  return rest;
}

export const withEaten = (log, date, id) =>
  withDay(log, date, { eaten: [...eaten(log, date), id], note: dayNote(log, date) });

// the day's n-th eaten taken off (out of range: the log as it was)
export function withoutEaten(log, date, n) {
  const list = eaten(log, date);

  if (n < 0 || n >= list.length) return log;
  return withDay(log, date, { eaten: list.filter((_, i) => i !== n), note: dayNote(log, date) });
}

export const withNote = (log, date, text) =>
  withDay(log, date, { eaten: eaten(log, date), note: text.trim() });

export const logEaten = (date, id) => log.edit(l => withEaten(l, date, id));

export const removeEaten = (date, n) => log.edit(l => withoutEaten(l, date, n));

export const setFoodNote = (date, text) => log.edit(l => withNote(l, date, text));
