// Stored medicine names, doses, schedules and stable codes.
import { parseRanges, rangesOf } from "#/shared/lib/ranges.js";

// the medicines of a course, a group each in the window: the name, the dose ("30 капель"; none:
// the words from the first number of the name), times (morning / day / evening, a dose each;
// none: once at any time), the meal (before | after | sleep | any), days
export const WHEN = { morning: ["☀️"], day: ["🌤"], evening: ["🌙"] };

export const TIME_KEYS = ["morning", "day", "evening"];

export const timesOf = (times = []) => times.flatMap(t => WHEN[t] ?? []);

export const MEAL_TEXT = { before: "перед едой", after: "после еды", sleep: "перед сном" };

// a name as typed may carry the dose ("Мастодинон 30 капель"): the words before its first number
const parts = typed => {
  const words = typed.trim().split(/\s+/), at = words.findIndex(w => /^\d/.test(w));

  return at < 0 ? [words.join(" "), ""] : [words.slice(0, at).join(" "), words.slice(at).join(" ")];
};

export const nameOf = typed => parts(typed)[0];

// A unique code per medicine; stored codes keep marks connected through renames and reordering.
const withCodes = groups => {
  const taken = new Set(groups.map(g => g.code).filter(Boolean));

  return groups.map(g => {
    if (g.code) return g;
    const n = nameOf(g.name).toUpperCase().replace(/[^\p{L}\p{N}]/gu, "");
    const tries = [...n.slice(1)].map(c => n[0] + c)
      .concat(Array.from({ length: 9 }, (_, i) => n.slice(0, 2) + (i + 2)));
    const code = tries.find(c => !taken.has(c)) ?? n.slice(0, 2);

    taken.add(code);
    return { ...g, code };
  });
};

// Visible abbreviations follow current names; stored codes remain the keys of the history.
export const labelsOf = meds => new Map(withCodes(meds.map(({ name }) => ({ name })))
  .map((m, i) => [meds[i].code, m.code]));

export const medicine = g => {
  const [name, dose] = parts(g.name);

  return {
    name, dose: g.dose?.trim() || dose, times: timesOf(g.times),
    meal: MEAL_TEXT[g.meal] ?? "", ranges: rangesOf(g), code: g.code,
  };
};

// the medicines as the record keeps them: as typed, a code each
export const normal = meds => withCodes(meds).map(g => ({
  name: g.name, code: g.code, dose: g.dose ?? "", times: TIME_KEYS.filter(t => g[t]),
  meal: g.meal ?? "any",
  ranges: typeof g.ranges === "string" || Array.isArray(g.ranges)
    ? parseRanges(g.ranges) : rangesOf(g),
}));
