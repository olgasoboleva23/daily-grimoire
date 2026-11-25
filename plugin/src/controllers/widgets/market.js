// Load the shopping card and the supplies page from the current list and purchase history.
import { MARKET_NOTE } from "#/shared/config/index.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { catOf, groupByCategory, readMarket, supplyStats } from "#/entities/product/index.js";

export async function loadCelestialMarket() {
  const mkt = await readMarket();

  if (mkt.missing) return { missing: true, path: MARKET_NOTE };
  const items = mkt.items.filter(i => i.isOpen);
  // a row: its line (to find it again) and its name (shown, and to check it's the same item)
  const row = i => ({
    line: i.src.line, id: i.id, name: i.name, type: i.type, needs: i.needs,
  });
  const n = items.length;

  return {
    empty: !n,
    left: `${n} item${n === 1 ? "" : "s"} left`,
    groups: groupByCategory(items, i => i.category, row),
    soon: supplyStats(mkt.history, todayYmd()).filter(s => s.due && !mkt.open.has(s.id ?? s.name))
      .map(s => s.name).join(", "),
  };
}

export async function loadSupplies() {
  const { history, open } = await readMarket();
  const stats = supplyStats(history, todayYmd());

  // a row: how long since the last time against the usual gap, or that it's on the list already
  const row = s => {
    const listed = open.has(s.id ?? s.name);
    const info = listed ? "on the shopping list ✦"
      : s.avg ? `${s.since} of ~${s.avg} days${s.due ? " ⏳" : ""}`
      : `bought ${s.buys} times`;

    return { id: s.id, name: s.name, type: s.type, due: s.due, listed, info };
  };

  return { empty: !stats.length, groups: groupByCategory(stats, s => catOf(s.type), row) };
}
