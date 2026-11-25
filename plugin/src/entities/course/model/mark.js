// Dose marks, intake times and the date printed on a course row.
import { weekday } from "#/shared/lib/dates.js";

const MARKS = ["☐", "✅", "❌"];

export const next = mark => MARKS[(MARKS.indexOf(mark) + 1) % MARKS.length];

export const TIMES = { "☀️": "☀️ утро", "🌤": "🌤 днём", "🌙": "🌙 на ночь", "": "в любое время" };
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export const dayLabel = date =>
  `${+date.slice(8, 10)} ${MONTHS[+date.slice(5, 7) - 1]}, ${DAYS[weekday(date) - 1]}`;
