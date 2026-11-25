// Purchase history, supply forecasts and choices for the shopping list.
import { diffDays } from "#/shared/lib/dates.js";
import { marketCats } from "./category.js";

// what was bought and when (a legacy line has no id), and the keys on the list now
export const historyOf = items => items.filter(i => i.isDone && i.doneOn)
  .map(i => ({ id: i.id, name: i.name, type: i.type, date: i.doneOn }));

export const openKeys = items => new Set(items.filter(i => i.isOpen).map(i => i.key));

// history oldest first, with each buy's item key: its id, else its lowercased name
const byItem = history => [...history].sort((a, b) => a.date.localeCompare(b.date))
  .map(h => [h.id ?? h.name.trim().toLowerCase(), h]);

// Staples from purchase history: anything bought at least twice.
// history: [{name, type, date}] of completed market items. A forecast (avg days
// between buys) needs 3+ buys; due when 85% of the usual interval has passed.
export const supplyStats = function (history, today) {
  const by = {};

  for (const [key, h] of byItem(history)) {
    (by[key] ??= { id: h.id, name: h.id ? h.name : key, dates: [] }).dates.push(h.date);
    by[key].type = h.type;
  }

  const twice = Object.values(by).filter(x => x.dates.length >= 2);

  return twice.sort((a, b) => a.name.localeCompare(b.name)).map(x => {
    const gaps  = x.dates.slice(1).map((d, i) => diffDays(d, x.dates[i]));
    const avg   = x.dates.length >= 3
      ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
      : null;
    const since = diffDays(today, x.dates.at(-1));
    const due   = avg !== null && since >= avg * 0.85;

    return {
      ...x.id ? { id: x.id } : {}, name: x.name, type: x.type,
      buys: x.dates.length, avg, since, due,
    };
  });
};

// Everything bought before, for the search: one per name (its last spelling and category), by
// category, then the most bought and the most recent first; onList when it's on the list now
// (`open`: lowercased names). `records`: the catalog by id (null: none yet).

export function marketChoices(history, open, records) {
  const by = Object.fromEntries(Object.entries(records ?? {}).map(
([id, r]) => [id, {
    id, name: r.name, type: r.type, buys: 0, last: "", onList: open.has(id),
  }]));

  for (const [key, h] of byItem(history)) {
    by[key] = {

      ...h.id ? { id: h.id } : {},
      name: h.name.trim(),
      type: h.type,
      buys: (by[key]?.buys ?? 0) + 1,
      last: h.date,
      onList: open.has(key),
    };
  }

  const rank = type => marketCats.findIndex(c => c.type === type) >>> 0;   // unknown tags last

  return Object.values(by).sort((a, b) =>
    rank(a.type) - rank(b.type) || b.buys - a.buys || b.last.localeCompare(a.last));
}
