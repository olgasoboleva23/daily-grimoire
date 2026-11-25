// Load the supplies page from the current shopping list and purchase history.
import { todayYmd } from "#/shared/lib/dates.js";
import { catOf, groupByCategory, readMarket, supplyStats } from "#/entities/product/index.js";

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
