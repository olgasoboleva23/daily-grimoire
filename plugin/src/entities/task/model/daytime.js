// Calendar groups, labels and sorting by time of day.
import { T } from "./task.js";

// a day's group: one-offs, or a 🔁 task by its time of day (morning, evening, other)
export const dayGroup = t => !T(t).isRecurring ? "one"
  : ["morning", "evening"].includes(T(t).daytime) ? T(t).daytime : "other";

// the mark of a task's time of day, "" without one
export const daytimeMark = time => ({ morning: "🌅 ", evening: "🌙 " })[time] ?? "";

// morning → none → evening
export const daytimeRank = time => ["morning", null, "evening"].indexOf(time);
