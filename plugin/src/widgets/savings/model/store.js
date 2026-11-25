// Savings jars as shown on the dashboard: progress, deposits and upcoming paydays.
import { dm, todayYmd, weekday } from "#/shared/lib/dates.js";
import { money } from "#/shared/lib/format.js";
import { SAVINGS } from "#/shared/config/index.js";
import { readJars } from "./repository/savings.js";

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const day = d => `${DAYS[weekday(d)]} ${dm(d)}`;

export async function loadSavings({ app }) {
  const today = todayYmd();
  const jars = (await readJars(app)).map(({ jar, ...entry }) => ({
    ...entry, ...shown(jar, today),
  }));

  return { jars, empty: `A goal: a note in ${SAVINGS}` };
}

// a jar as the card shows it: the picture greyed above what's saved, past halfway "left" instead
// of "saved", a ✦ stamp per deposit (rows of 8, one free), the payday's "put in" until it's in
function shown(jar, today) {
  const pct = jar.pct, count = jar.deposits.length, due = jar.due(today);
  const grey = pct === null ? 100 : Math.max(0, 100 - pct);

  return {
    greyed: `clip-path: inset(0 0 ${100 - grey}% 0)`,
    big: pct !== null && pct >= 50 ? `left ${money(jar.left)}` : money(jar.saved),
    note: pct === null
      ? `saved · ${count} deposit${count === 1 ? "" : "s"}`
      : `${pct}% of ${money(jar.price)}`,
    fill: pct === null ? null : Math.min(100, pct),
    stamps: Array.from({ length: Math.max(8, Math.ceil((count + 1) / 8) * 8) }, (_, i) =>
      i < count),
    due: due && {
      when: due.payday === today ? "payday today" : `payday ${day(due.payday)}`,
      sum: due.sum ? money(due.sum) : "your part",
    },
    next: jar.next(today, 2).map(day).join(" · "),
  };
}
