// Validate the day ranges entered for each medicine.
import { MAX_DAY, rangesProblem } from "#/shared/lib/ranges.js";

export const courseProblem = v => {
  for (const g of v.meds ?? []) {
    const bad = rangesProblem(g.ranges);

    if (bad) {
      return `days of «${g.name}»: can't read «${bad}» (like 1-30, 45-60, 70; up to ${MAX_DAY})`;
    }
  }

  return null;
};
