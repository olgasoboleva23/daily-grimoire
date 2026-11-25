// Load the market card with open items and supplies due for purchase.
import { MARKET_NOTE } from "#/shared/config/index.js";
import { todayYmd } from "#/shared/lib/dates.js";
import { groupByCategory, readMarket, supplyStats } from "#/entities/product/index.js";

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
